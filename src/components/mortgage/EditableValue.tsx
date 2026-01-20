import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditableValueProps {
  value: string;
  subValue?: string;
  onClick: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EditableValue({ 
  value, 
  subValue, 
  onClick, 
  className,
  size = 'md' 
}: EditableValueProps) {
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    sm: 'text-lg font-semibold',
    md: 'text-2xl font-bold',
    lg: 'text-3xl font-bold',
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group flex items-center gap-2 text-left transition-colors hover:text-primary',
        className
      )}
    >
      <div>
        <span className={sizeClasses[size]}>{value}</span>
        {subValue && (
          <p className="text-xs text-muted-foreground">{subValue}</p>
        )}
      </div>
      <Pencil 
        className={cn(
          'h-4 w-4 transition-opacity',
          isHovered ? 'opacity-100' : 'opacity-0'
        )} 
      />
    </button>
  );
}
