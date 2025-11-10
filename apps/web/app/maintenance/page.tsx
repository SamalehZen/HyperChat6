'use client';

export default function MaintenancePage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl w-full space-y-8">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/10 rounded-full">
                        <svg className="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold text-white">
                        Utilisation du service
                    </h1>
                    <p className="text-lg text-amber-400 font-semibold">
                        CPU Fluid Active
                    </p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl py-8 px-6 sm:px-8 space-y-6">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-300">Durée d'utilisation</span>
                            <span className="text-xl font-semibold text-white">4h 25m / 4h</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div className="bg-gradient-to-r from-red-500 to-orange-500 h-full rounded-full" style={{ width: '110%' }}></div>
                        </div>
                        <p className="text-sm text-red-400">Quota dépassé</p>
                    </div>

                    <div className="border-t border-white/10 pt-6">
                        <p className="text-gray-200 text-center leading-relaxed">
                            Vous avez dépassé votre quota d'utilisation alloué. Afin de continuer à bénéficier du service sans interruption, nous vous invitons à passer à la version payante au tarif de <span className="font-semibold text-white">120 $/mois</span>.
                        </p>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <p className="text-blue-200 text-sm text-center">
                            N'hésitez pas à poser vos questions à <span className="font-semibold">Arka Sam</span> pour toute information complémentaire.
                        </p>
                    </div>
                </div>

                <div className="text-center space-y-4">
                    <p className="text-gray-400 text-sm">
                        Pour reprendre le service, veuillez contacter l'administrateur.
                    </p>
                </div>
            </div>
        </div>
    );
}
