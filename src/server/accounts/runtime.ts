import { webDatabase } from "../database";
import { TemporaryBotAccountCompatibility } from "./bot-compatibility";
import { ProviderProfileStore } from "./provider-profiles";
import { AccountService } from "./service";

export const accountService = new AccountService(webDatabase);
export const providerProfileStore = new ProviderProfileStore(webDatabase);
export const botAccountCompatibility = new TemporaryBotAccountCompatibility(webDatabase, accountService);
