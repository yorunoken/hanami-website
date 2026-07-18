import { webDatabase } from "../database";
import { TemporaryBotIdentityCompatibility } from "./bot-compatibility";
import { UserIdentityRepository } from "./repository";

export const botIdentityCompatibility = new TemporaryBotIdentityCompatibility(webDatabase);
export const userIdentities = new UserIdentityRepository(webDatabase, botIdentityCompatibility);
