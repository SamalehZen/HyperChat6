import { cn } from '@repo/ui';
import React from 'react';
import {
  ArrowRight as LucideArrowRight,
  BarChart3 as LucideBarChart,
  Book as LucideBook,
  Bolt as LucideBolt,
  Check as LucideCheck,
  CheckCircle2 as LucideCircleCheck,
  ChevronLeft as LucideArrowBarLeft,
  ChevronRight as LucideArrowBarRight,
  ChevronsUpDown as LucideSelector,
  Clock as LucideClock,
  Code as LucideCode,
  Command as LucideCommand,
  Copy as LucideCopy,
  File as LucideFile,
  FileText as LucideFileText,
  Globe as LucideWorld,
  HelpCircle as LucideHelp,
  ImagePlus as LucideImagePlus,
  Key as LucideKey,
  Lightbulb as LucideLightbulb,
  LogOut as LucideLogout,
  MessageCircle as LucideMessageCircle,
  Moon as LucideMoon,
  Paperclip as LucidePaperclip,
  Pencil as LucidePencil,
  Pin as LucidePin,
  Plus as LucidePlus,
  Search as LucideSearch,
  Settings as LucideSettings,
  SlidersHorizontal as LucideSliders,
  Sun as LucideSun,
  Terminal as LucideTerminal,
  Trash2 as LucideTrash,
  User as LucideUser,
  X as LucideX,
  Frown as LucideFrown,
  ExternalLink as LucideExternalLink,
} from 'lucide-react';

export type IconProps = React.ComponentProps<typeof LucidePlus>;

export const IconArrowBarLeft = (props: IconProps) => <LucideArrowBarLeft aria-hidden="true" {...props} />;
export const IconArrowBarRight = (props: IconProps) => <LucideArrowBarRight aria-hidden="true" {...props} />;
export const IconCommand = (props: IconProps) => <LucideCommand aria-hidden="true" {...props} />;
export const IconLogout = (props: IconProps) => <LucideLogout aria-hidden="true" {...props} />;
export const IconPinned = (props: IconProps) => <LucidePin aria-hidden="true" {...props} />;
export const IconPlus = (props: IconProps) => <LucidePlus aria-hidden="true" {...props} />;
export const IconSearch = (props: IconProps) => <LucideSearch aria-hidden="true" {...props} />;
export const IconSelector = (props: IconProps) => <LucideSelector aria-hidden="true" {...props} />;
export const IconSettings = (props: IconProps) => <LucideSettings aria-hidden="true" {...props} />;
export const IconSettings2 = (props: IconProps) => <LucideSliders aria-hidden="true" {...props} />;
export const IconUser = (props: IconProps) => <LucideUser aria-hidden="true" {...props} />;
export const IconBolt = (props: IconProps) => <LucideBolt aria-hidden="true" {...props} />;
export const IconBoltFilled = (props: IconProps) => <LucideBolt aria-hidden="true" {...props} />;
export const IconKey = (props: IconProps) => <LucideKey aria-hidden="true" {...props} />;
export const IconTrash = (props: IconProps) => <LucideTrash aria-hidden="true" {...props} />;
export const IconCircleCheckFilled = (props: IconProps) => (
  <LucideCircleCheck aria-hidden="true" {...props} />
);
export const IconHelpSmall = (props: IconProps) => <LucideHelp aria-hidden="true" {...props} />;
export const IconX = (props: IconProps) => <LucideX aria-hidden="true" {...props} />;
export const IconMessageCircleFilled = (props: IconProps) => (
  <LucideMessageCircle aria-hidden="true" {...props} />
);
export const IconClock = (props: IconProps) => <LucideClock aria-hidden="true" {...props} />;
export const IconWorld = (props: IconProps) => <LucideWorld aria-hidden="true" {...props} />;
export const IconAdjustments = (props: IconProps) => <LucideSliders aria-hidden="true" {...props} />;
export const IconPhotoPlus = (props: IconProps) => <LucideImagePlus aria-hidden="true" {...props} />;
export const IconPaperclip = (props: IconProps) => <LucidePaperclip aria-hidden="true" {...props} />;
export const IconTerminal = (props: IconProps) => <LucideTerminal aria-hidden="true" {...props} />;
export const IconJson = (props: IconProps) => <LucideCode aria-hidden="true" {...props} />;
export const IconMarkdown = (props: IconProps) => <LucideFileText aria-hidden="true" {...props} />;
export const IconFileFilled = (props: IconProps) => <LucideFile aria-hidden="true" {...props} />;
export const IconBrandPython = (props: IconProps) => <LucideCode aria-hidden="true" {...props} />;
export const IconBrandJavascript = (props: IconProps) => <LucideCode aria-hidden="true" {...props} />;
export const IconBrandTypescript = (props: IconProps) => <LucideCode aria-hidden="true" {...props} />;
export const IconBrandReact = (props: IconProps) => <LucideCode aria-hidden="true" {...props} />;
export const IconArrowRight = (props: IconProps) => <LucideArrowRight aria-hidden="true" {...props} />;
export const IconSun = (props: IconProps) => <LucideSun aria-hidden="true" {...props} />;
export const IconMoon = (props: IconProps) => <LucideMoon aria-hidden="true" {...props} />;
export const IconCopy = (props: IconProps) => <LucideCopy aria-hidden="true" {...props} />;
export const IconCheck = (props: IconProps) => <LucideCheck aria-hidden="true" {...props} />;
export const IconMoodSadDizzy = (props: IconProps) => <LucideFrown aria-hidden="true" {...props} />;
export const IconExternalLink = (props: IconProps) => <LucideExternalLink aria-hidden="true" {...props} />;
export const IconBook = (props: IconProps) => <LucideBook aria-hidden="true" {...props} />;
export const IconBulb = (props: IconProps) => <LucideLightbulb aria-hidden="true" {...props} />;
export const IconChartBar = (props: IconProps) => <LucideBarChart aria-hidden="true" {...props} />;
export const IconPencil = (props: IconProps) => <LucidePencil aria-hidden="true" {...props} />;
export const IconQuestionMark = (props: IconProps) => <LucideHelp aria-hidden="true" {...props} />;

export const NomenclatureDouaniereIcon = () => {
  return <IconFileFilled size={20} strokeWidth={2} className="text-muted-foreground" />;
};

export const ToolIcon = ({ className }: { className?: string }) => {
  return (
    <div className={`flex size-5 items-center justify-center rounded-md border border-yellow-900 bg-yellow-800 p-0.5 ${className}`}>
      <LucideSettings size={20} strokeWidth={2} className="text-yellow-400" aria-hidden="true" />
    </div>
  );
};

export const ToolResultIcon = () => {
  return (
    <div className="flex size-5 items-center justify-center rounded-md border border-yellow-900 bg-yellow-800 p-0.5">
      <LucideCode size={20} strokeWidth={2} className="text-yellow-400" aria-hidden="true" />
    </div>
  );
};

export const DeepResearchIcon = () => {
  return <LucideCode size={20} strokeWidth={2} className="text-muted-foreground" aria-hidden="true" />;
};

export const BYOKIcon = () => {
  return (
    <div className="flex-inline flex h-5 items-center justify-center gap-1 rounded-md bg-emerald-500/20 p-0.5 px-1 font-mono text-xs font-medium text-emerald-600">
      BYOK
    </div>
  );
};

export const NewIcon = () => {
  return (
    <div className="flex-inline flex h-5 items-center justify-center gap-1 rounded-md bg-emerald-500/20 p-0.5 px-1 font-mono text-xs font-medium text-emerald-500">
      New
    </div>
  );
};

export const ComingSoonIcon = () => (
  <div className="flex-inline flex h-5 items-center justify-center gap-1 rounded-md bg-emerald-500/20 p-0.5 px-1 font-mono text-xs font-medium text-emerald-500">
    Bientôt disponible
  </div>
);

export const CreditIcon = ({
  credits,
  variant = 'default',
}: {
  credits: number;
  variant?: 'default' | 'muted';
}) => {
  return (
    <div
      className={cn(
        'flex-inline text-muted-foreground flex h-5 items-center justify-center gap-0.5 rounded-md border border-none font-mono text-xs font-medium opacity-50',
        variant === 'muted' && 'border-none'
      )}
    >
      <IconBolt size={14} strokeWidth={2} className="text-muted-foreground" aria-hidden="true" /> {credits}
    </div>
  );
};
