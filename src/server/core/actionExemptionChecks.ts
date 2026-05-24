import { context, reddit, redis } from "@devvit/web/server";
import { AppSetting, SubredditSettings } from ".";
import { addDays } from "date-fns";

function getCacheKeyForUser (username: string): string {
    return `userCache:${username}`;
}

export async function clearPrivilegedUserCache (username: string) {
    await redis.del(getCacheKeyForUser(username));
    console.log(`Cleared privileged user cache for user ${username}`);
}

interface PrivelegedUserType {
    isMod: boolean;
    isApprovedUser: boolean;
}

async function getPrivilegedUserType (username: string): Promise<PrivelegedUserType> {
    const cachedValue = await redis.get(getCacheKeyForUser(username));
    if (cachedValue) {
        return JSON.parse(cachedValue) as PrivelegedUserType;
    }

    const [isMod, isApprovedUser] = await Promise.all([
        reddit.getModerators({
            subredditName: context.subredditName,
            username,
        }).all().then(mods => mods.length > 0),
        reddit.getApprovedUsers({
            subredditName: context.subredditName,
            username,
        }).all().then(users => users.length > 0),
    ]);

    const result: PrivelegedUserType = { isMod, isApprovedUser };
    await redis.set(getCacheKeyForUser(username), JSON.stringify(result), { expiration: addDays(new Date(), 28) });
    return result;
}

export async function isUserExemptFromActions (username: string, appSettings: SubredditSettings): Promise<boolean> {
    if (!appSettings[AppSetting.ExemptModsFromAllEnforcementActions] && !appSettings[AppSetting.ExemptApprovedUsersFromAllEnforcementActions]) {
        return false;
    }

    const { isMod, isApprovedUser } = await getPrivilegedUserType(username);

    if (appSettings[AppSetting.ExemptModsFromAllEnforcementActions] && isMod) {
        return true;
    }

    if (appSettings[AppSetting.ExemptApprovedUsersFromAllEnforcementActions] && isApprovedUser) {
        return true;
    }

    return false;
}
