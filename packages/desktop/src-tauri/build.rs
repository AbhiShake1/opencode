fn main() {
    if let Ok(git_ref) = std::env::var("GITHUB_REF") {
        let branch = git_ref.strip_prefix("refs/heads/").unwrap_or(&git_ref);
        if branch == "beta" {
            println!("cargo:rustc-env=OPENCODE_SQLITE=1");
        }
    }

    ensure_sidecar();
    tauri_build::build()
}

fn ensure_sidecar() {
    use std::fs;
    use std::path::PathBuf;

    let profile = std::env::var("PROFILE").unwrap_or_else(|_| "debug".to_string());
    let target = std::env::var("TARGET").unwrap_or_default();
    if target.is_empty() {
        return;
    }

    let manifest_dir = match std::env::var("CARGO_MANIFEST_DIR") {
        Ok(value) => PathBuf::from(value),
        Err(_) => return,
    };

    let sidecars = manifest_dir.join("sidecars");
    let binary = if target.contains("windows") {
        sidecars.join(format!("opencode-cli-{target}.exe"))
    } else {
        sidecars.join(format!("opencode-cli-{target}"))
    };

    if binary.exists() {
        return;
    }

    if profile == "release" {
        panic!(
            "Missing sidecar binary at {}. Run `bun --cwd packages/desktop run predev` or copy a built CLI sidecar before release build.",
            binary.display()
        );
    }

    fs::create_dir_all(&sidecars).expect("failed to create sidecars directory");

    if target.contains("windows") {
        let script = "@echo off\r\necho OpenCodex sidecar placeholder. Run `bun --cwd packages/desktop run predev` to install the real sidecar.\r\nexit /b 1\r\n";
        fs::write(&binary, script).expect("failed to write windows sidecar placeholder");
    } else {
        let script = "#!/usr/bin/env sh\n\
echo 'OpenCodex sidecar placeholder. Run `bun --cwd packages/desktop run predev` to install the real sidecar.'\n\
exit 1\n";
        fs::write(&binary, script).expect("failed to write sidecar placeholder");
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut permissions = fs::metadata(&binary)
                .expect("failed to read sidecar placeholder metadata")
                .permissions();
            permissions.set_mode(0o755);
            fs::set_permissions(&binary, permissions)
                .expect("failed to set sidecar placeholder permissions");
        }
    }

    println!(
        "cargo:warning=Sidecar missing, created debug placeholder at {}",
        binary.display()
    );
}
