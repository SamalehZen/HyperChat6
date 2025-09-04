import { useUser } from '@clerk/nextjs';
import { cn, Dialog, DialogContent } from '@repo/ui';
import { IconCircleCheckFilled } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Logo } from './logo';
export const IntroDialog = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { isSignedIn } = useUser();

    useEffect(() => {
        const hasSeenIntro = localStorage.getItem('hasSeenIntro');
        if (!hasSeenIntro) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem('hasSeenIntro', 'true');
        setIsOpen(false);
    };

    const icon = (
        <IconCircleCheckFilled className="text-muted-foreground/50 mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full" />
    );

    const points = [
        {
            icon,
            text: `**Agent de Classification d'Articles** : Structure et organise vos articles en fonction de la hiérarchie du magasin, en respectant les secteurs, rayons, familles et sous-familles.`,
        },
        {
            icon,
            text: `**Agent de Conversion PDF vers Excel (Pro)** : Convertit vos factures PDF en tableaux Excel bien structurés, prêts pour l’analyse et la gestion.`,
        },
        {
            icon,
            text: `**Agent de Correction de Libellés** : Corrige vos libellés selon les normes en vigueur, en respectant les règlements, la marque, les descriptions et le grammage.`,
        },
        {
            icon,
            text: `**Prochaines Évolutions (Bientôt Disponible)**: L'intégration de nouveaux agents est prévue pour couvrir un éventail encore plus large de vos besoins opérationnels.`,
        },
    ];

    if (isSignedIn) {
        return null;
    }

    return (
        <Dialog
            open={isOpen}
            onOpenChange={open => {
                if (open) {
                    setIsOpen(true);
                } else {
                    handleClose();
                }
            }}
        >
            <DialogContent
                ariaTitle="Introduction"
                className="flex max-w-[420px] flex-col gap-0 overflow-hidden p-0"
            >
                <div className="flex flex-col gap-8 p-5">
                    <div className="flex flex-col gap-2">
                        <div
                            className={cn(
                                'flex h-8 w-full cursor-pointer items-center justify-start gap-1.5 '
                            )}
                        >
                            <Logo className="text-brand size-5" />
                            <p className="font-clash text-foreground text-lg font-bold tracking-wide">
                                HyperFix
                            </p>
                        </div>
                        <p className="text-base font-semibold">
                            Solutions Personnalisées d'Agents IA pour HyperFix
                        </p>
                        <p className="text-muted-foreground text-sm">
                            Des agents intelligents sur mesure, conçus pour répondre
                            spécifiquement aux besoins uniques d'HyperFix.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-semibold">Nos Agents :</h3>

                        <div className="flex flex-col items-start gap-1.5">
                            {points.map((point, index) => (
                                <div key={index} className="flex-inline flex items-start gap-2">
                                    {point.icon}
                                    <ReactMarkdown
                                        className="text-sm"
                                        components={{
                                            p: ({ children }) => (
                                                <p className="text-muted-foreground text-sm">
                                                    {children}
                                                </p>
                                            ),
                                            strong: ({ children }) => (
                                                <span className="text-sm font-semibold">
                                                    {children}
                                                </span>
                                            ),
                                        }}
                                    >
                                        {point.text}
                                    </ReactMarkdown>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
