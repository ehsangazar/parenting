import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { Icon } from '../icons/index.js';

type StreakIconProps = {
  className?: string;
  iconClassName?: string;
  active?: boolean;
};

export const StreakIcon = ({ className = 'h-6 w-6', iconClassName = 'h-3.5 w-3.5', active = true }: StreakIconProps) => {
  return (
    <span
      className={`inline-flex items-center justify-center ${
        active ? 'text-orange-500' : 'text-gray-400'
      } ${className}`}
    >
      <Icon name={appAssetIcons.questStreak} className={`${iconClassName} object-contain`} alt="" />
    </span>
  );
};
