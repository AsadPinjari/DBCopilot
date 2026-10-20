const fs = require("fs");
const path = require("path");
const AdmZip = require("../backend/node_modules/adm-zip");

const extensionDir = path.resolve(__dirname);
const outputFile = path.join(extensionDir, "dbcopilot-1.0.0.vsix");

const zip = new AdmZip();

// 1. [Content_Types].xml
const contentTypesXml = `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="json" ContentType="application/json" />
  <Default Extension="vsixmanifest" ContentType="text/xml" />
  <Default Extension="js" ContentType="application/javascript" />
  <Default Extension="map" ContentType="application/json" />
  <Default Extension="png" ContentType="image/png" />
  <Default Extension="md" ContentType="text/markdown" />
</Types>`;
zip.addFile("[Content_Types].xml", Buffer.from(contentTypesXml, "utf8"));

// 2. extension.vsixmanifest
const vsixManifestXml = `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
  <Metadata>
    <Identity Id="dbcopilot" Version="1.0.0" Publisher="dbcopilot" TargetPlatform="universal" />
    <DisplayName>DB Copilot</DisplayName>
    <Description>AI-powered database development assistant, schema validation, and compatibility analyzer for VS Code</Description>
    <Icon>extension/media/icon.png</Icon>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code" Version="[1.85.0,)" />
  </Installation>
  <Dependencies />
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Icons.Default" Path="extension/media/icon.png" Addressable="true" />
  </Assets>
</PackageManifest>`;
zip.addFile("extension.vsixmanifest", Buffer.from(vsixManifestXml, "utf8"));

// 3. extension/package.json
zip.addFile(
  "extension/package.json",
  fs.readFileSync(path.join(extensionDir, "package.json"))
);

// 4. extension/README.md
zip.addFile(
  "extension/README.md",
  fs.readFileSync(path.join(extensionDir, "README.md"))
);

// 5. extension/media/icon.png
if (fs.existsSync(path.join(extensionDir, "media", "icon.png"))) {
  zip.addFile(
    "extension/media/icon.png",
    fs.readFileSync(path.join(extensionDir, "media", "icon.png"))
  );
}

// 6. extension/out/
const outDir = path.join(extensionDir, "out");
if (fs.existsSync(outDir)) {
  const files = fs.readdirSync(outDir);
  for (const f of files) {
    zip.addFile(
      `extension/out/${f}`,
      fs.readFileSync(path.join(outDir, f))
    );
  }
}

zip.writeZip(outputFile);
console.log(`VSIX package created successfully at: ${outputFile}`);
