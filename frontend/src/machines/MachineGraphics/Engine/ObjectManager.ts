import { Crane } from './Sprite/Crane'
import type { Engine } from '.'
import { Cloud, Sprite } from '.'

const BASE_URL = import.meta.env.BASE_URL

export class ObjectManager {
  engine: Engine

  images = {
    'bg': load(`${BASE_URL}img/graphics/bg.jpg`),
    'crane': load(`${BASE_URL}img/graphics/crane.png`),
    'fighters-states': load(`${BASE_URL}img/graphics/fighters-states.png`),
    'fighters-host': load(`${BASE_URL}img/graphics/fighters-host.png`),
    'fighters-guest': load(`${BASE_URL}img/graphics/fighters-guest.png`),
    'clouds': load(`${BASE_URL}img/graphics/clouds.png`),
  }

  sprites = new Map<string, Sprite>()

  constructor(engine: Engine) {
    this.engine = engine
  }

  get(key: string) {
    return this.sprites.get(key)!
  }

  delete(key: string) {
    this.sprites.delete(key)
  }

  async addBg() {
    this.delete('fighters')
    const image = await this.images.bg

    const bg = new Sprite({ engine: this.engine, image, x: 0, y: 0, width: 1 })

    this.sprites.set('bg', bg)
  }

  async addClouds() {
    for (let i = 0; i < 10; i++) {
      const image = await this.images.clouds

      const cloud = new Cloud({ engine: this.engine, image })

      this.sprites.set(cloud.key, cloud)
    }
  }

  async addCranes() {
    for (let i = 0; i < 7; i++) {
      const image = await this.images.crane

      const crane = new Crane({ engine: this.engine, image })

      this.sprites.set(crane.key, crane)
    }
  }

  createFightersSprite(image: HTMLImageElement, sx: number) {
    this.delete('fighters')

    const fighters = new Sprite({
      engine: this.engine,

      image,

      x: 0.32,
      y: 0.3,
      width: 0.36,
      sx,
      sy: 0,
      sWidth: 1080,
      sHeight: 635,
    })

    this.sprites.set('fighters', fighters)
  }

  async animateFightersIdle() {
    const image = await this.images['fighters-states']

    this.createFightersSprite(image, 0)
  }

  async animateFightersHostGuessedWord(sx: number) {
    const image = await this.images['fighters-host']

    this.createFightersSprite(image, sx)
  }

  async animateFightersGuestGuessedWord(sx: number) {
    const image = await this.images['fighters-guest']

    this.createFightersSprite(image, sx)
  }

  async animateFightersHostWon() {
    const image = await this.images['fighters-states']

    this.createFightersSprite(image, 1080)
  }

  async animateFightersGuestWon() {
    const image = await this.images['fighters-states']

    this.createFightersSprite(image, 2160)
  }
}

function load(url: string) {
  return new Promise<HTMLImageElement>((resolve) => {
    if (!import.meta.env.SSR) {
      const img = new Image()

      img.src = url

      img.onload = () => resolve(img)
    }
  })
}
