import type { Engine } from '..'
import { Sprite } from './Sprite'
import { useRandomInRange } from '@/composables/useRandomInRange'

interface Constructor {
  image: HTMLImageElement
  engine: Engine
}

export class Crane extends Sprite {
  key: string
  animationInterval: number
  totalTime = 0
  spriteIndex = 0

  constructor({ image, engine }: Constructor) {
    Crane.count++

    super({
      image,
      engine,
      x: 0,
      y: 0,
      width: 0.025,
      sx: 0,
      sy: 0,
      sWidth: 100,
      sHeight: 89,
      isTranslating: true,
    })

    this.animationInterval = useRandomInRange(0.5, 0.8)

    const max = ~~(Crane.count / 7 * this.engine.width)
    const min = ~~((Crane.count - 1) / 7 * this.engine.width)

    this.realX = ~~(Math.random() * (max - min) + min)
    this.realY = ~~(Math.random() * (this.engine.height / 14)) + 50

    this.key = `crane-${Crane.count}`
  }

  customUpdate(delta: number) {
    this.realX += 10 * delta
    this.totalTime += delta

    if (this.totalTime > this.animationInterval) {
      this.totalTime = 0
      if (this.spriteIndex < 2)
        this.spriteIndex++
      else this.spriteIndex = 0
      this.sx = this.spriteIndex * 100
      this.updateTranslationMatrix()
      this.updateTexMatrix()
    }

    if (this.realX > this.engine.width)
      this.realX = -this.realWidth
  }

  updateRealPositions() {
    // discard Sprite default updateRealPositions
  }

  static count = 0
}
