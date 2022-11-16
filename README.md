## Bahamut Bot (TS)
> This is a rewrite of [Bahamut Bot](https://github.com/TheExoduser/BahamutBot) in TypeScript!

> ❗ WIP! As of yet only a part of the features have been ported.

Bahamut Bot is a multi purpose discord bot, designed to provide various functionalities for discord servers.

### To-Do
- Migrate all commands relying on moment.js to luxon, since the development of moment has stopped
- Implement a new timed check for [ffxiv island news](https://www.reddit.com/r/ffxiv/comments/xvcklg/island_sanctuary_workshop_hub/)
  - This check should be done on the C&C server, so it runs only once and not on every ShardManager
- Enhance joke command
- Implement trivia quiz game
- Move global schedulers to C&C server
  - Lodestone scheduler should be run once, not multiple times on every shard
  - Same goes for the fashion report scheduled on each ShardingManager
- Add config templates