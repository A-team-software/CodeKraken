const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const appRoot = path.resolve(__dirname, "..");
const envPath = path.join(appRoot, ".env");
const templatePath = path.join(appRoot, "manifest.yml.hbs");
const outputPath = path.join(appRoot, "manifest.yml");

function loadEnv() {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
    }
}

function main() {
    if (!fs.existsSync(templatePath)) {
        throw new Error("manifest.yml.hbs not found");
    }

    loadEnv();
    const serverRemoteUrl = process.env.SERVER_REMOTE_URL;

    if (!serverRemoteUrl) {
        throw new Error(
            "SERVER_REMOTE_URL is missing. Set it in apps/JiraForge/.env before running build."
        );
    }

    const template = fs.readFileSync(templatePath, "utf8");
    const manifest = template.replace(/{{\s*SERVER_REMOTE_URL\s*}}/g, serverRemoteUrl);

    fs.writeFileSync(outputPath, manifest, "utf8");
    console.log(`Generated ${path.relative(appRoot, outputPath)} from manifest.yml.hbs`);
}

main();
