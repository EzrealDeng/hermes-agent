# Desktop Packaging Config

Optional files in this directory customize local installer builds.

## Default Connection

Copy `default-connection.example.json` to `default-connection.json` before
building to make first launch use a preconfigured Desktop connection.

## Bundled Python Runtime

To ship Hermes Agent inside the Desktop installer, build with:

```bash
HERMES_DESKTOP_BUNDLE_PYTHON_RUNTIME=1 npm run dist:mac:dmg --workspace apps/desktop
```

This creates `apps/desktop/build/hermes-runtime/venv` and packages it into
Electron resources. The app will prefer that bundled venv before the normal
bootstrap/install ladder.

For Windows installers, build on Windows so the venv contains Windows Python
and Windows wheels:

```powershell
$env:HERMES_DESKTOP_BUNDLE_PYTHON_RUNTIME = "1"
npm run dist:win --workspace apps/desktop
```

You can also provide a prebuilt runtime directory:

```bash
HERMES_DESKTOP_BUNDLED_RUNTIME_DIR=/path/to/hermes-runtime npm run dist:mac:dmg --workspace apps/desktop
```

The supplied directory must contain `venv/bin/python` on macOS/Linux or
`venv\Scripts\python.exe` on Windows, with `hermes-agent` installed into that
venv non-editably.
