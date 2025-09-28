import { useChatStore } from '@repo/common/store';
import { Button } from '@repo/ui';
import {
    IconBook,
    IconBulb,
    IconChartBar,
    IconPencil,
    IconQuestionMark,
} from './icons';
import { Editor } from '@tiptap/react';

export const examplePrompts = {
    howTo: [
        'Comment planifier un potager durable pour les petits espaces ?',
        'Comment se préparer pour sa première expérience de voyage international ?',
        'Comment établir un budget personnel qui fonctionne réellement ?',
        'Comment améliorer ses compétences en prise de parole en public pour un cadre professionnel ?',
    ],

    explainConcepts: [
        'Expliquez le fonctionnement de la technologie blockchain en termes simples.',
        "Qu'est-ce que l'informatique quantique et en quoi diffère-t-elle de l'informatique traditionnelle ?",
        "Expliquez le concept d'intelligence émotionnelle et son importance.",
        'Comment fonctionne la technologie de capture du carbone pour lutter contre le changement climatique ?',
    ],

    examplePrompts: [
        "Écrivez une nouvelle sur une rencontre fortuite qui change la vie de quelqu'un.",
        'Créez une recette pour un plat fusion combinant les cuisines italienne et japonaise.',
        'Concevez une ville durable fictive du futur.',
        'Développez le profil d\'un personnage pour le protagoniste d\'un roman de science-fiction.',
    ],

    advice: [
        "Quelle est la meilleure approche pour négocier une augmentation de salaire ?",
        'Comment dois-je me préparer pour un marathon en tant que coureur débutant ?',
        'Quelles stratégies peuvent aider à gérer l\'équilibre entre vie professionnelle et vie privée en travaillant à distance ?',
        'Que dois-je prendre en considération lors de la première adoption d\'un animal de compagnie ?',
    ],

    analysis: [
        "Analysez l'impact potentiel de l'intelligence artificielle sur les soins de santé.",
        'Comparez différentes approches pour lutter contre le changement climatique.',
        'Examinez les avantages et les inconvénients de diverses sources d\'énergie renouvelable.',
        'Analysez comment les médias sociaux ont transformé la communication au cours de la dernière décennie.',
    ],
};

export const getRandomPrompt = (category?: keyof typeof examplePrompts) => {
    if (category && examplePrompts[category]) {
        const prompts = examplePrompts[category];
        return prompts[Math.floor(Math.random() * prompts.length)];
    }

    // If no category specified or invalid category, return a random prompt from any category
    const categories = Object.keys(examplePrompts) as Array<keyof typeof examplePrompts>;
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const prompts = examplePrompts[randomCategory];
    return prompts[Math.floor(Math.random() * prompts.length)];
};

// Map of category to icon component
const categoryIcons = {
    howTo: { name: 'Comment faire', icon: IconQuestionMark, color: '!text-yellow-700' },
    explainConcepts: { name: 'Expliquer les concepts', icon: IconBulb, color: '!text-blue-700' },
    creative: { name: 'Créatif', icon: IconPencil, color: '!text-green-700' },
    advice: { name: 'Conseil', icon: IconBook, color: '!text-purple-700' },
    analysis: { name: 'Analyse', icon: IconChartBar, color: '!text-red-700' },
};

export const ExamplePrompts = () => {
    const editor: Editor | undefined = useChatStore(state => state.editor);
    const setInputValue = useChatStore(state => state.setInputValue);

    const handleCategoryClick = (category: keyof typeof examplePrompts) => {
        const randomPrompt = getRandomPrompt(category);
        if (editor) {
            editor.commands.clearContent();
            editor.commands.insertContent(randomPrompt);
            return;
        }
        setInputValue(randomPrompt);
    };

    return (
        <div className="animate-fade-in flex w-full flex-nowrap items-center justify-center gap-2 overflow-x-auto px-3 py-1 duration-[300ms] no-scrollbar">
            {Object.entries(categoryIcons).map(([category, value], index) => (
                <Button
                    key={index}
                    variant="bordered"
                    rounded="full"
                    size="sm"
                    onClick={() => handleCategoryClick(category as keyof typeof examplePrompts)}
                >
                    <value.icon size={16} className={'text-muted-foreground/50'} />
                    {value.name}
                </Button>
            ))}
        </div>
    );
};
