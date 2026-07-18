import { webDatabase } from "../server/database";
import { diagnoseOrphanAuthenticationUsers, redactCanonicalUserId } from "../server/identities/orphan-diagnostic";

try {
    const candidates = await diagnoseOrphanAuthenticationUsers(webDatabase);
    console.log(`Orphan authentication user candidates: ${candidates.length}`);
    for (const candidate of candidates) {
        console.log(
            `candidate user=${redactCanonicalUserId(candidate.userId)} classification=${candidate.classification} accounts=${candidate.accountCount} createdAt=${candidate.createdAt.toISOString()}`,
        );
    }
    console.log("No rows were changed.");
} finally {
    await webDatabase.end();
}
