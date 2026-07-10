import * as React from 'react';

import {
  Progress as ProgressPrimitive,
  ProgressIndicator as ProgressIndicatorPrimitive,
  type ProgressProps as ProgressPrimitiveProps,
} from '@/components/animate-ui/primitives/radix/progress';
import { cn } from '@/lib/utils';

type ProgressProps = ProgressPrimitiveProps;

function Progress({ className, ...props }: ProgressProps) {
  return (
    <ProgressPrimitive
      className={cn(
        'bg-primary/20 relative h-2 w-full overflow-hidden rounded-full',
        className,
      )}
      {...props}
    >
      {/* Fill color comes from --progress-foreground so callers can theme it
          (brief E: moss for packing/budget); falls back to brand. */}
      <ProgressIndicatorPrimitive
        className="rounded-full h-full w-full flex-1"
        style={{ background: 'var(--progress-foreground, var(--primary))' }}
      />
    </ProgressPrimitive>
  );
}

export { Progress, type ProgressProps };
