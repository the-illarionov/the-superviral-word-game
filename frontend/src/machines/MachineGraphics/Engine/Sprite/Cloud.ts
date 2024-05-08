import type { Engine } from '..'
import { Sprite } from '..'
import { useRandomInRange } from '@/composables/useRandomInRange'

interface Constructor {
  image: HTMLImageElement
  engine: Engine
}

export class Cloud extends Sprite {
  speed = 0
  key: string

  constructor({ image, engine }: Constructor) {
    Cloud.count++

    super({
      image,
      engine,
      x: 0,
      y: 0,
      width: 0,
      sWidth: 200,
      sHeight: 90,
      sx: 0,
      sy: 0,
      isTranslating: true,
    })

    const max = ~~(Cloud.count / 10 * this.engine.width)
    const min = ~~((Cloud.count - 1) / 10 * this.engine.width)

    this.realX = ~~(Math.random() * (max - min) + min)

    this.key = `cloud-${Cloud.count}`
    this.setLevelAndOptions()
  }

  setLevelAndOptions() {
    this.width = useRandomInRange(0.07, 0.14)
    this.speed = useRandomInRange(10, 20)
    this.sx = (Math.ceil(useRandomInRange(0, 7)) + 1) * 200
    this.realY = ~~(Math.random() * (this.engine.height / 14))

    this.updateRealSizes()
    this.updateTranslationMatrix()
    this.updateTexMatrix()
  }

  customUpdate(delta: number) {
    this.realX += this.speed * delta

    if (this.realX > this.engine.width) {
      this.setLevelAndOptions()
      this.realX = -this.realWidth
    }
  }

  updateRealPositions() {
    // discard Sprite default updateRealPositions
  }

  static count = 0

  static updateOptionsSpeed(width: number) {
    Cloud.options.far.speed = width / 60
    Cloud.options.mid.speed = width / 40
    Cloud.options.close.speed = width / 20
  }

  static options = {
    far: {
      width: 0.13,
      speed: 10,
    },
    mid: {
      width: 0.1,
      speed: 20,
    },
    close: {
      width: 0.07,
      speed: 30,
    },
  }
}
