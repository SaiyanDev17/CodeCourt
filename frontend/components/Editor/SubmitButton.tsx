import Button from '../ui/Button'

export interface SubmitButtonProps {
  /** Callback function triggered when the submit button is clicked */
  onSubmit: () => void
  /** Whether the submission is currently being judged */
  isJudging: boolean
  /** Optional additional CSS classes */
  className?: string
}

/**
 * SubmitButton component for code submission.
 * 
 * Displays a submit button that shows a loading state during judging.
 * The button is disabled while isJudging is true to prevent duplicate submissions.
 * 
 * @example
 * <SubmitButton 
 *   onSubmit={handleSubmit} 
 *   isJudging={isJudging}
 * />
 */
export default function SubmitButton({
  onSubmit,
  isJudging,
  className,
}: SubmitButtonProps) {
  return (
    <Button
      variant="primary"
      size="lg"
      onClick={onSubmit}
      isLoading={isJudging}
      disabled={isJudging}
      className={className}
      aria-label={isJudging ? 'Judging submission' : 'Submit code'}
    >
      {isJudging ? 'Judging...' : 'Submit Code'}
    </Button>
  )
}
