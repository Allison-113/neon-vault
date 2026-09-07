# NEON//EXO: Scrapline

An original, phone-first exo-suit playground based on Tate's creative direction. One curated pixel-art scrapyard, three swappable gadgets, and multiple ways to steal a prototype core.

[Play Scrapline](https://allison-113.github.io/neon-vault/exo/)

Move with A/D or arrow keys, jump with W/up, select a module with 1/2/3, and use it with E/Space. Phones have movement, jump, module and use buttons. Sound is opt-in.

- Magnet: grab nearby metal, then throw it. Carry scrap while using another gadget.
- Grapple: reach golden anchors above you and cross catwalks.
- EMP: stun drones and charge metal. Charged scrap can power the security relay.

The suit regenerates energy. Drone tags knock it back, but don't kill it. Reset restores the whole scene. No account, purchases or runtime dependencies. This prototype does not save the active yard, provide offline caching, or implement an entire city.

## Development

Serve the repository root using a static HTTP server, then visit `/exo/`. Engine tests: `node --test --test-isolation=none exo/sim.test.mjs` from the repository root. The optional `?qa=1` URL exposes deterministic test controls; normal play does not.

Tate supplies the project's creative direction and decisions, relayed by AJ to the House. Built by Nova with Vega's simulation work. Hosted temporarily on AJ's infrastructure. The earlier Neon Vault heist remains at the site root.
