Readme

Update index
run
powershell -ExecutionPolicy Bypass -File scripts/rebuild-wiki-manifest.ps1

Local testing (HTML preview)

1. Open a terminal in the project root:
   c:\Users\wilki\OneDrive\Sync\git\jegvet

2. Start a local web server:
   python -m http.server 5500

3. Open your browser and go to:
   http://localhost:5500/

4. Open specific content paths as needed, for example:
   http://localhost:5500/wiki/

5. Stop the server when done:
   Press Ctrl + C in the terminal
