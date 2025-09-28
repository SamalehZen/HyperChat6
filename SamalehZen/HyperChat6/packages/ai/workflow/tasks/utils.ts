export const generateErrorMessage = (error: Error | string) => {
    if (error instanceof Error) {
        if (error.message.includes('429')) {
            return 'Vous avez atteint la limite de requêtes par minute. Réessayez plus tard.';
        }

        if (error.message.includes('401')) {
            return 'Vous n’êtes pas autorisé à accéder à cette ressource. Réessayez.';
        }

        if (error.message.includes('403')) {
            return 'Vous n’êtes pas autorisé à accéder à cette ressource. Réessayez.';
        }

        if (error.message.toLowerCase().includes('timeout')) {
            return 'Délai dépassé. Réessayez.';
        }

        if (
            error.message.toLowerCase().includes('api') &&
            error.message.toLowerCase().includes('key')
        ) {
            return 'Clé API invalide. Vérifiez la clé et réessayez.';
        }

        return 'Une erreur est survenue. Réessayez plus tard.';
    }

    return 'Une erreur est survenue. Réessayez plus tard.';
};
