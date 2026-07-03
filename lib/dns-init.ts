import dns from "dns";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve("./iptv.db");

let customDnsServer: string | null = null;
let resolverInstance: dns.Resolver | null = null;

// Helper to load DNS server from SQLite
export function reloadDnsConfig() {
  try {
    const db = new Database(DB_PATH);
    // Create settings table if not exists (so it doesn't fail)
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("custom_dns") as { value: string } | undefined;
    const dnsIp = row?.value;

    customDnsServer = dnsIp && dnsIp.trim() !== "" ? dnsIp.trim() : null;
    if (customDnsServer) {
      resolverInstance = new dns.Resolver();
      resolverInstance.setServers([customDnsServer]);
      console.log(`[DNS] Custom DNS configured: ${customDnsServer}`);
    } else {
      resolverInstance = null;
      console.log("[DNS] Custom DNS disabled (using system default)");
    }
    db.close();
  } catch (err) {
    console.error("[DNS] Failed to load DNS config:", err);
  }
}

// Initialize on load
reloadDnsConfig();

const originalLookup = dns.lookup;

(dns as any).lookup = function (hostname: string, options: any, callback: any) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }

  // Avoid routing local requests to custom DNS
  if (resolverInstance && !hostname.includes("localhost") && hostname !== "127.0.0.1" && !hostname.endsWith(".local")) {
    resolverInstance.resolve4(hostname, (err, addresses) => {
      if (err || addresses.length === 0) {
        // Fallback to system DNS
        originalLookup(hostname, options, callback);
      } else {
        if (options.all) {
          const results = addresses.map((addr) => ({ address: addr, family: 4 }));
          callback(null, results);
        } else {
          callback(null, addresses[0], 4);
        }
      }
    });
  } else {
    originalLookup(hostname, options, callback);
  }
};
