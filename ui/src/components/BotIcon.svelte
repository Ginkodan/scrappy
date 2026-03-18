<script lang="ts">
    interface IconProps {
        color?: string;
        size?: number;
        strokeWidth?: number;
        class?: string;
    }

    let {
        color = 'currentColor',
        size = 24,
        strokeWidth = 2,
        class: className = ''
    }: IconProps = $props();

    let eyeY1 = $state(13);
    let eyeY2 = $state(15);
    let animating = $state(false);

    function animateEyes(
        startY1: number,
        startY2: number,
        endY1: number,
        endY2: number,
        duration: number,
        delay: number = 0
    ): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(() => {
                const startTime = performance.now();
                const tick = (currentTime: number): void => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased =
                        progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                    eyeY1 = startY1 + (endY1 - startY1) * eased;
                    eyeY2 = startY2 + (endY2 - startY2) * eased;
                    if (progress < 1) requestAnimationFrame(tick);
                    else resolve();
                };
                requestAnimationFrame(tick);
            }, delay);
        });
    }

    async function playBlink() {
        if (animating) return;
        animating = true;
        await animateEyes(13, 15, 14, 14, 220, 0);
        await animateEyes(14, 14, 13, 15, 220);
        animating = false;
    }

    // blink automatically every ~4 seconds with a small random jitter
    $effect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        function schedule() {
            const delay = 3500 + Math.random() * 1500;
            timeout = setTimeout(async () => {
                await playBlink();
                schedule();
            }, delay);
        }
        schedule();
        return () => clearTimeout(timeout);
    });
</script>

<div class={className} aria-label="bot" role="img" onmouseenter={playBlink}>
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        stroke-width={strokeWidth}
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2" />
        <path d="M20 14h2" />
        <line x1="15" y1={eyeY1} x2="15" y2={eyeY2} />
        <line x1="9" y1={eyeY1} x2="9" y2={eyeY2} />
    </svg>
</div>

<style>
    div {
        display: inline-flex;
        align-items: center;
    }
</style>
