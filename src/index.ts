import type { Plugin, PluginAPI } from "@lumeweb/relay-types";
import type { Peer } from "@lumeweb/peer-discovery";
import { IrcClient } from "@ctrl/irc";
import b4a from "b4a";
import jsonStringify from "json-stringify-deterministic";
import type { Message } from "@ctrl/irc/dist/src/parseMessage";

interface SignedPeerResponse extends Peer {
  timestamp: number;
  signature?: string;
}

interface Network {
  host: string;
  port: number;
  ssl: boolean;
}

const plugin: Plugin = {
  name: "discovery-irc",
  async plugin(api: PluginAPI): Promise<void> {
    for (const network of api.pluginConfig.array("networks", []) as Network[]) {
      let client = new IrcClient(undefined, api.identity.fingerprintHex, {
        host: network.host,
        port: network.port,
        secure: network.ssl,
        channels: ["#lumeweb"],
      });
      client.addListener("message", function (from, to, message) {
        const pubkey = b4a.from(message, "hex");
        if (!b4a.equals(api.identity.publicKeyRaw, pubkey)) {
          return;
        }

        const host = api.config.str("domain");
        const port = api.config.uint("port");
        const timestamp = Date.now();

        let data = {
          host,
          port,
          timestamp,
        } as SignedPeerResponse;

        let json = jsonStringify(data);

        data.signature = b4a
          .from(api.identity.sign(b4a.from(jsonStringify(data))))
          .toString("hex");

        api.logger.info(api.identity.verify(b4a.from(json), data.signature));

        client.say(from, jsonStringify(data));
      });
      client.addListener("error", (message: Message) => {
        api.logger.error(message);
      });

      client.connect();

      process.on("SIGTERM", () => {
        client.end();
      });
    }
  },
};

export default plugin;
