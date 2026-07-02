interface FlagProps {
  value: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'h-5 w-5 text-lg',
  md: 'h-8 w-8 text-2xl',
  lg: 'h-10 w-10 text-3xl',
};

/**
 * Renders a team flag/crest. Accepts either an emoji string (e.g. "🇧🇷")
 * or an image URL (e.g. a team crest from a football API) and renders
 * the right thing automatically.
 */
export function Flag({ value, size = 'md', className = '' }: FlagProps) {
  const isImageUrl = /^https?:\/\//.test(value);

  if (isImageUrl) {
    return (
      <img
        src={value}
        alt=""
        className={`inline-block rounded-sm object-contain align-middle ${SIZES[size].split(' ').slice(0, 2).join(' ')} ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <span className={`inline-block leading-none align-middle ${SIZES[size].split(' ')[2]} ${className}`}>
      {value || '🏳️'}
    </span>
  );
}
