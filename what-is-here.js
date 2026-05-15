const { execSync } = require('child_process');
try {
    const result = execSync('ls -la && echo "---" && find . -name "*.mjs" -type f').toString();
    console.log(result);
} catch (e) {
    console.error(e.toString());
}
