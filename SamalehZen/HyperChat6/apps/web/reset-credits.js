// Script pour réinitialiser les crédits Redis
// Exécutez ceci dans votre console Vercel ou localement

// 1. Réinitialiser les crédits pour un utilisateur spécifique
const resetUserCredits = async (userId) => {
    const key = `credits:user:${userId}`;
    const lastRefillKey = `${key}:lastRefill`;
    
    // Supprimer les clés Redis
    await kv.del(key);
    await kv.del(lastRefillKey);
    
    console.log(`Crédits réinitialisés pour l'utilisateur: ${userId}`);
};

// 2. Réinitialiser les crédits pour une IP spécifique
const resetIpCredits = async (ip) => {
    const key = `credits:ip:${ip}`;
    const lastRefillKey = `${key}:lastRefill`;
    
    // Supprimer les clés Redis
    await kv.del(key);
    await kv.del(lastRefillKey);
    
    console.log(`Crédits réinitialisés pour l'IP: ${ip}`);
};

// 3. Lister toutes les clés de crédits
const listAllCreditKeys = async () => {
    const keys = await kv.keys('credits:*');
    console.log('Toutes les clés de crédits:', keys);
    return keys;
};

// 4. Supprimer toutes les clés de crédits (ATTENTION: Réinitialise tout)
const resetAllCredits = async () => {
    const keys = await kv.keys('credits:*');
    for (const key of keys) {
        await kv.del(key);
    }
    console.log(`${keys.length} clés de crédits supprimées`);
};

export { resetUserCredits, resetIpCredits, listAllCreditKeys, resetAllCredits };