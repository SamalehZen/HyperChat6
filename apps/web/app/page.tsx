'use client';

const IS_PAUSED = true;

export default function Home() {
    if (!IS_PAUSED) {
        return <></>;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Utilisation du service
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        CPU Fluid Active
                    </p>
                    <p className="mt-1 text-center text-lg text-gray-900 font-medium">
                        Durée d'utilisation : 4h 25m / 4h
                    </p>
                </div>
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <div className="space-y-6">
                        <p className="text-gray-700 text-center">
                            Vous avez dépassé votre quota d'utilisation alloué. Afin de continuer à bénéficier du service sans interruption, nous vous invitons à passer à la version payante au tarif de 120 $/mois.
                        </p>
                        <div className="text-center">
                            <p className="text-sm text-gray-600">
                                N'hésitez pas à poser vos questions à Arka Sam pour toute information complémentaire.
                            </p>
                            <a href="mailto:arka@sam.com" className="mt-2 inline-block text-blue-600 hover:text-blue-500 text-sm font-medium">
                                Contactez-nous
                            </a>
                        </div>
                    </div>
                </div>
                <div className="text-center text-sm text-gray-500">
                    <p>
                        Pour reprendre le site, modifiez ce fichier et mettez IS_PAUSED à false.
                    </p>
                </div>
            </div>
        </div>
    );
}
