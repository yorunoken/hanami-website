import { webDatabase } from "../database";
import { TemporaryBotAccountCompatibility } from "./bot-compatibility";
import { AccountService } from "./service";

export const accountService = new AccountService(webDatabase);
export const botAccountCompatibility = new TemporaryBotAccountCompatibility(webDatabase, accountService);
