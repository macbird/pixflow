#!/usr/bin/env python3
"""Extract Square Cloud database credentials and build Prisma DATABASE_URL."""

import base64
import json
import subprocess
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: extract-square-db.py <database.json> <out_dir>", file=sys.stderr)
        return 1

    payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    # CLI may print JSON directly or wrap in response
    data = payload.get("response", payload)
    connection_url = data.get("connection_url") or data.get("url")
    certificate = data.get("certificate")
    password = data.get("password", "squarecloud")
    p12_password = "squarecloud"

    if not connection_url or not certificate:
        raise SystemExit("Missing connection_url or certificate in database response")

    pem_path = out_dir / "certificate.pem"
    pem_path.write_bytes(base64.b64decode(certificate))

    key_path = out_dir / "client.key"
    crt_path = out_dir / "client.crt"
    p12_path = out_dir / "client.p12"

    # Best-effort split if Square returns combined PEM
    pem_text = pem_path.read_text(encoding="utf-8")
    if "BEGIN PRIVATE KEY" in pem_text and "BEGIN CERTIFICATE" in pem_text:
        key_part = pem_text.split("-----END")[0] + "-----END PRIVATE KEY-----\n"
        cert_part = "-----BEGIN CERTIFICATE-----" + pem_text.split("-----BEGIN CERTIFICATE-----", 1)[1]
        key_path.write_text(key_part, encoding="utf-8")
        crt_path.write_text(cert_part, encoding="utf-8")
        subprocess.run(
            [
                "openssl",
                "pkcs12",
                "-export",
                "-out",
                str(p12_path),
                "-inkey",
                str(key_path),
                "-in",
                str(crt_path),
                "-password",
                f"pass:{p12_password}",
                "-certpbe",
                "AES-256-CBC",
                "-keypbe",
                "AES-256-CBC",
                "-macalg",
                "SHA256",
            ],
            check=True,
        )
    else:
        p12_path.write_bytes(base64.b64decode(certificate))

    # Prisma URL relative to app root in zip
    db_url = (
        f"{connection_url.split('?')[0]}"
        f"?sslidentity=./client.p12&sslpassword={p12_password}"
    )
    (out_dir / "database_url.txt").write_text(db_url, encoding="utf-8")
    print(db_url)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
