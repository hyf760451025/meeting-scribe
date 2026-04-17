interface WaveformProps {
  active: boolean
  volume: number  // 0 ~ 1
}

const BAR_COUNT = 8

export default function Waveform({ active, volume }: WaveformProps) {
  // 根据音量生成每根柱子的高度比例
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    if (!active) return 0.15
    // 加入一点随机感，基于 volume 和位置
    const base = volume * 0.8
    const offset = Math.sin((i / BAR_COUNT) * Math.PI) * 0.3
    return Math.min(1, Math.max(0.1, base + offset))
  })

  return (
    <div className="flex items-center gap-[2px] h-4">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-[2px] rounded-full transition-all duration-100"
          style={{
            height: `${Math.round(height * 16)}px`,
            backgroundColor: active
              ? `rgba(99, 102, 241, ${0.5 + height * 0.5})`
              : 'rgba(82, 82, 91, 0.4)',
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  )
}
