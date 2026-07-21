import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  Building2,
  CircleCheckBig,
  CircleHelp,
  CirclePlus,
  AlertTriangle,
  FolderOpen,
  FilePenLine,
  Hand,
  Headset,
  House,
  Image as ImageIcon,
  Images,
  Inbox,
  Info,
  Languages,
  LayoutDashboard,
  List,
  Mail,
  Mails,
  MapPinned,
  Menu,
  MessageSquare,
  Newspaper,
  Phone,
  Plus,
  Presentation,
  Save,
  Settings,
  Sparkles,
  Star,
  Trash2,
  User,
  UserRoundPlus,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type AdminIconName =
  | "dashboard"
  | "apartment"
  | "add_circle"
  | "mail"
  | "article"
  | "group"
  | "menu"
  | "settings"
  | "info"
  | "photo_library"
  | "home"
  | "map"
  | "person"
  | "translate"
  | "arrow_back"
  | "arrow_forward"
  | "check_circle"
  | "edit_note"
  | "star"
  | "forum"
  | "inbox"
  | "drafts"
  | "call"
  | "touch_app"
  | "person_add"
  | "add"
  | "warning"
  | "trash"
  | "close"
  | "save"
  | "support_agent"
  | "cancel"
  | "fiber_new"
  | "slideshow"
  | "image"
  | "list"
  | "analytics"
  | "documents"
  | "swap";

const ICONS: Record<AdminIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  apartment: Building2,
  add_circle: CirclePlus,
  mail: Mail,
  article: Newspaper,
  group: Users,
  menu: Menu,
  settings: Settings,
  info: Info,
  photo_library: Images,
  home: House,
  map: MapPinned,
  person: User,
  translate: Languages,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  check_circle: CircleCheckBig,
  edit_note: FilePenLine,
  star: Star,
  forum: MessageSquare,
  inbox: Inbox,
  drafts: Mails,
  call: Phone,
  touch_app: Hand,
  person_add: UserRoundPlus,
  add: Plus,
  warning: AlertTriangle,
  trash: Trash2,
  close: X,
  save: Save,
  support_agent: Headset,
  cancel: XCircle,
  fiber_new: Sparkles,
  slideshow: Presentation,
  image: ImageIcon,
  list: List,
  analytics: BarChart3,
  documents: FolderOpen,
  swap: ArrowLeftRight,
};

type AdminIconProps = {
  name: AdminIconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  ariaHidden?: boolean;
};

export function AdminIcon({
  name,
  size = 18,
  className,
  strokeWidth = 2,
  ariaHidden = true,
}: AdminIconProps) {
  const Icon = ICONS[name] ?? CircleHelp;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden={ariaHidden} />;
}