const { MongoClient } = require("mongodb");
const BaseDatabaseAdapter = require("./base.adapter");

const CONNECTION_TIMEOUT_MS = 10000;

class MongoDBAdapter extends BaseDatabaseAdapter {
  constructor() {
    super("mongodb", "MongoDB", "non-relational");
  }

  getCapabilities() {
    return {
      engine: this.engine,
      displayName: this.displayName,
      category: "non-relational",
      status: "Implemented and tested",
      features: {
        connection: "Implemented and tested",
        schemaInspection: "Implemented and tested",
        queryValidation: "Implemented and tested",
        codebaseDetection: "Implemented and tested",
        aiAssistance: "Implemented and tested",
        diagnostics: "Implemented and tested",
      },
      notes: "Inspects collections, indexes, and infers document schemas via document sampling. Validates Mongoose/Mongo find and aggregation pipeline queries.",
    };
  }

  buildUri(config) {
    if (config.uri) {
      return config.uri;
    }

    const host = config.host || "localhost";
    const port = Number(config.port) || 27017;
    const db = config.database || "test";

    if (config.username && config.password) {
      const user = encodeURIComponent(config.username);
      const pass = encodeURIComponent(config.password);
      return `mongodb://${user}:${pass}@${host}:${port}/${db}`;
    }

    return `mongodb://${host}:${port}/${db}`;
  }

  async testConnection(config) {
    const uri = this.buildUri(config);
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: CONNECTION_TIMEOUT_MS,
      connectTimeoutMS: CONNECTION_TIMEOUT_MS,
    });

    try {
      await client.connect();
      await client.db(config.database || "test").command({ ping: 1 });
      return true;
    } finally {
      await client.close();
    }
  }

  async inspectSchema(config) {
    const uri = this.buildUri(config);
    const dbName = config.database || "test";
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: CONNECTION_TIMEOUT_MS,
      connectTimeoutMS: CONNECTION_TIMEOUT_MS,
    });

    try {
      await client.connect();
      const db = client.db(dbName);
      const collections = await db.listCollections().toArray();

      const schema = {
        database: dbName,
        engine: this.engine,
        category: "document",
        tables: [], // Presented as tables/collections in shared schema format
      };

      for (const collInfo of collections) {
        const collName = collInfo.name;
        if (collName.startsWith("system.")) continue;

        const coll = db.collection(collName);

        // Fetch indexes
        let indexes = [];
        try {
          indexes = await coll.indexes();
        } catch {
          indexes = [];
        }

        // Infer fields from sample documents (max 50)
        const sampleDocs = await coll.find({}).limit(50).toArray();
        const fieldMap = new Map();

        // Always ensure _id is present
        fieldMap.set("_id", {
          name: "_id",
          type: "ObjectId",
          primaryKey: true,
          nullable: false,
        });

        for (const doc of sampleDocs) {
          for (const [key, value] of Object.entries(doc)) {
            if (key === "_id") continue;

            const existing = fieldMap.get(key);
            let valType = typeof value;
            if (Array.isArray(value)) valType = "array";
            else if (value === null) valType = "null";
            else if (value instanceof Date) valType = "date";
            else if (value && typeof value === "object" && value._bsontype) {
              valType = value._bsontype;
            }

            if (!existing) {
              fieldMap.set(key, {
                name: key,
                type: valType,
                primaryKey: false,
                nullable: true,
              });
            }
          }
        }

        const columns = Array.from(fieldMap.values()).map((f) => ({
          name: f.name,
          type: f.type,
          fullType: f.type,
          nullable: f.nullable,
          primaryKey: f.primaryKey,
          unique: indexes.some((idx) => idx.unique && idx.key?.[f.name]),
          foreignKey: false,
        }));

        schema.tables.push({
          name: collName,
          columns,
          indexes: indexes.map((idx) => ({
            name: idx.name,
            keys: Object.keys(idx.key || {}),
            unique: Boolean(idx.unique),
          })),
          relationships: [],
        });
      }

      return schema;
    } finally {
      await client.close();
    }
  }

  validateQuery(queryString, schema) {
    const findings = [];
    const knownCollections = new Set(
      (schema.tables || []).map((t) => t.name.toLowerCase())
    );

    // Check for collection name in db.<collection> or Model.<method>
    const collMatch = queryString.match(/(?:db\.([a-zA-Z0-9_]+)|\b([A-Z][a-zA-Z0-9_]+)\.(?:find|findOne|aggregate|updateOne|deleteMany))/);

    if (collMatch) {
      const collName = (collMatch[1] || collMatch[2]).toLowerCase();
      if (!knownCollections.has(collName) && !knownCollections.has(collName + "s")) {
        findings.push({
          code: "COLLECTION_NOT_FOUND",
          message: `Collection "${collMatch[1] || collMatch[2]}" does not exist in MongoDB database "${schema.database}".`,
          collection: collMatch[1] || collMatch[2],
        });
      }
    }

    // Check aggregation pipeline stages and operators for common errors
    if (/aggregate\s*\(/i.test(queryString)) {
      const validStages = new Set([
        "$addFields", "$bucket", "$bucketAuto", "$collStats", "$count", "$densify",
        "$documents", "$facet", "$fill", "$geoNear", "$graphLookup", "$group",
        "$indexStats", "$limit", "$lookup", "$match", "$merge", "$out",
        "$planCacheStats", "$project", "$redact", "$replaceRoot", "$replaceWith",
        "$sample", "$search", "$searchMeta", "$set", "$setWindowFields", "$skip",
        "$sort", "$sortByCount", "$unionWith", "$unset", "$unwind"
      ]);

      const validOperators = new Set([
        "$sum", "$avg", "$min", "$max", "$push", "$addToSet", "$first", "$last", "$stdDevPop", "$stdDevSamp",
        "$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin", "$and", "$or", "$not", "$nor",
        "$exists", "$type", "$expr", "$jsonSchema", "$mod", "$regex", "$text", "$where",
        "$all", "$elemMatch", "$size", "$slice", "$filter", "$map", "$reduce", "$concatArrays", "$reverseArray",
        "$cond", "$ifNull", "$switch", "$concat", "$substr", "$substrBytes", "$substrCP",
        "$toLower", "$toUpper", "$trim", "$ltrim", "$rtrim", "$split",
        "$abs", "$ceil", "$divide", "$exp", "$floor", "$multiply", "$pow", "$round", "$sqrt", "$subtract",
        "$dateToString", "$dateFromString", "$year", "$month", "$dayOfMonth", "$hour", "$minute", "$second",
        "$toInt", "$toDouble", "$toDecimal", "$toLong", "$toString", "$toBool", "$toDate", "$toObjectId"
      ]);

      // Check top-level stages: e.g. [{ $match: ... }, { $group: ... }]
      const stageMatches = queryString.matchAll(/(?:\[|,)\s*\{\s*(\$[a-zA-Z0-9_]+)\s*:/g);
      for (const sm of stageMatches) {
        const stage = sm[1];
        if (!validStages.has(stage)) {
          findings.push({
            code: "INVALID_PIPELINE_STAGE",
            message: `Unknown aggregation pipeline stage "${stage}".`,
            stage,
          });
        }
      }

      // Also check general operator names throughout query
      const allOps = queryString.matchAll(/\$([a-zA-Z0-9_]+)\s*:/g);
      for (const op of allOps) {
        const opName = "$" + op[1];
        if (!validStages.has(opName) && !validOperators.has(opName)) {
          if (!findings.some((f) => f.stage === opName)) {
            findings.push({
              code: "INVALID_PIPELINE_STAGE",
              message: `Unknown aggregation operator or stage "${opName}".`,
              stage: opName,
            });
          }
        }
      }
    }

    return {
      status: findings.length > 0 ? "invalid" : "valid",
      supported: true,
      findings,
    };
  }
}

module.exports = MongoDBAdapter;
