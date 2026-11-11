import fs from 'fs'
import path from 'path'
import { POSTS, PILLAR_BY_KEY, AUTHORS, postBySlug } from './index'
import { RESOURCES } from '../resources'
import { POSTS as INSIGHT_POSTS } from '../insights'
import { img } from '../../ds/landingImages'

const landingDir = path.join(__dirname, '..', '..')

test('every Library card opens a blog article, not the documentation', () => {
    RESOURCES.forEach((item) => {
        expect(item.to).toMatch(/^\/blog\//)
        expect(postBySlug(item.to.slice('/blog/'.length))).not.toBeNull()
    })
})

test('every article linked from Latest writing, Community, the newsroom and search exists', () => {
    INSIGHT_POSTS.forEach((post) => expect(postBySlug(post.slug)).not.toBeNull())
})

test('no /blog/ link written anywhere in the landing pages points at a missing article', () => {
    const files = []
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) files.push(full)
    })
    walk(landingDir)
    const missing = []
    files.forEach((file) => {
        const text = fs.readFileSync(file, 'utf8')
        for (const match of text.matchAll(/['`]\/blog\/([a-z0-9-]+)['`]/g)) {
            if (match[1] !== 'topic' && !postBySlug(match[1])) missing.push(`${path.relative(landingDir, file)}: ${match[1]}`)
        }
    })
    expect(missing).toEqual([])
})

test('every article has a unique slug, a real section and author, a known image and a body', () => {
    const slugs = POSTS.map((post) => post.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    POSTS.forEach((post) => {
        expect(PILLAR_BY_KEY[post.pillar]).toBeTruthy()
        expect(AUTHORS[post.author]).toBeTruthy()
        expect(img(post.image).alt).toBeTruthy()
        expect(Array.isArray(post.body) && post.body.length > 0).toBe(true)
        post.body.forEach((block) => expect(typeof block.t).toBe('string'))
    })
})
