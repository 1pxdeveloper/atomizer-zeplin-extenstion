/**
 * Export functions you want to work with, see documentation for details:
 * https://github.com/zeplin/zeplin-extension-documentation
 */

const pad = (str) => str.length === 1 ? "0" + str : str
const toHex = (dec) => pad(dec.toString(16))
const toHexColor = (color) => color ? "#" + toHex(color.r) + toHex(color.g) + toHex(color.b) + color.a.toString().slice(1, 4) : ""
const toClassName = (classList) => [...new Set(classList.map(cls => cls.trim()).filter(Boolean))].join(" ")

const round = (value, precision = 0) => {
  const multiplier = Math.pow(10, precision || 0)
  return Math.round(value * multiplier) / multiplier
}

const createClassList = (layer, classList = []) => {
  const {x, y, width, height} = layer.rect
  classList.push(`w(${round(width)})`)
  classList.push(`h(${round(height)})`)
  if (layer.borderRadius) classList.push(`r(${round(layer.borderRadius)})`)
  if (layer.borders.length) classList.push(`b(${toHexColor(layer.borders[0].fill.color)})`)
  if (layer.fills.length) classList.push(`bg(${toHexColor(layer.fills[0].color)})`)
  if (layer.opacity >= 0 && layer.opacity < 1) classList.push(`opacity(${round(layer.opacity, 2)})`)
  return classList
}

const createTextHTML = (layer) => {

  const classList = []

  layer.textStyles.forEach(({range, textStyle}) => {
    const fontStyle = textStyle.fontStyle === "normal" ? "" : textStyle.fontStyle
    const fontWeight = textStyle.weightText === "regular" ? "" : textStyle.weightText
    const color = toHexColor(textStyle.color)

    let font = round(textStyle.fontSize)
    if (textStyle.lineHeight) font += "/" + round(textStyle.lineHeight, 2)
    if (textStyle.letterSpacing) font += "/" + round(textStyle.letterSpacing, 2)

    classList.push(`font(${font})`)
    classList.push(fontWeight)
    classList.push(fontStyle)
    classList.push(`c(${color})`)

    if (textStyle.textAlign) classList.push(`text-${textStyle.textAlign}`)
  })

  if (layer.opacity >= 0 && layer.opacity < 1) classList.push(`opacity(${round(layer.opacity, 2)})`)

  const className = toClassName(classList)

  return `<div class="${className}">${layer.content || ""}</div>`
}

const createShapeHTML = (layer) => {
  const classList = createClassList(layer)
  const className = toClassName(classList)
  const tagName = "div"
  const children = layer.children || []

  return `<${tagName} class="${className}">${children.map(createHTML)}</${tagName}>`
}

const createHTML = (layer, context) => {
  switch (layer.type) {
    case "text":
      return createTextHTML(layer, context)
    case "shape":
      return createShapeHTML(layer, context)
    case "group":
      return createShapeHTML(layer, context)
  }

  return `<!-- unknowon type: ${layer.type} -->`
}

function layer(context, layer) {

  console.log("context", context)
  console.log("layer", layer)

  return createHTML(layer, context)
}

const flatLayers = (layers, ref = [], depth = 0) => {
  layers && layers.forEach(layer => {
    layer.depth = depth
    ref.push(layer)
    flatLayers(layer.layers, ref, depth + 1)
  })
  return ref
}

const containsPointInRect = (rect, x, y) => rect.x <= x && x <= rect.x + rect.width && rect.y <= y && y <= rect.y + rect.height

const containsRectInRect = (rect, r) => containsPointInRect(rect, r.x, r.y) && containsPointInRect(rect, r.x + r.width, r.y + r.height)

const isSameRect = (r1, r2) => r1.x === r2.x && r1.y === r2.y && r1.width === r2.width && r1.height === r2.height

const myCalc = (rect, r) => containsRectInRect(rect, r) ? rect.width * rect.height - r.width * r.height : Infinity


function screen(context, selectedVersion, selectedScreen) {

  if (true) return;

  console.log("context", context)
  console.log("selectedVersion", selectedVersion)

  const __merge = (a, b) => Object.keys(b).reduce((obj, key) => (obj[key] = obj[key] || b[key], obj), {...a})

  const __partition = (array, callback) => {
    const fail = []
    return [array.filter(value => callback(value) ? true : !!(fail.push(value) & false)), fail]
  }

  const __groupBy = (array, callback) => {
    const result = Object.create(null)
    array.forEach(value => {
      const key = callback(value)
      result[key] = result[key] || []
      result[key].push(value)
    })
    return result
  }

  let allLayers = flatLayers(selectedVersion.layers)
    .filter(layer => layer.type !== "group")
    .map(layer => {
      const absoluteRect = {...layer.rect}
      let p = layer
      while ((p = p.parent)) {
        absoluteRect.x += p.rect.x
        absoluteRect.y += p.rect.y
      }

      return {
        ...layer,
        rect: absoluteRect
      }
    })
    .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x || b.rect.width - a.rect.width || b.rect.height - a.rect.height || a.depth - b.depth)


  // @TODO: 위치와 크기순으로 미리 정렬했기 때문에 같은 크기는 전체 비교 없이 다음것만 비교해도 된다.

  // @TODO: 같은 rect를 가지는 shape는 서로 포함하는 관계라서 중복을 제거해야 한다.


  // const map = Object.create(null)
  // allLayers.forEach(layer => {
  //   const {x, y, width, height} = layer.rect
  //   const key = [x, y, width, height].join(" ")
  //   map[key] = map[key] ? __merge(map[key], layer) : layer
  // })
  //
  // allLayers = Object.values(map)


  console.log(allLayers)

  const [texts, rest1] = __partition(allLayers, layer => layer.type === "text")
  const [shape_atoms, rest2] = __partition(rest1, layer => !texts.some(text => containsRectInRect(layer.rect, text.rect)))

  const atoms = [...texts, ...shape_atoms]

  // console.log("texts", texts)
  // console.log("shapes", shapes)

  // allLayers.filter()


  // allLayers.forEach(layer => {
  //
  //   const sorted = allLayers
  //     .filter(l => l !== layer)
  //     .map(otherLayer => ({layer: otherLayer, score: myCalc(otherLayer.rect, layer.rect)})).sort((a, b) => a.score - b.score)
  //
  //   console.log("sorted", layer, sorted)
  //
  //   const parent = sorted[0]
  //
  //   console.log("parent", parent, parent.score !== Infinity)
  //
  //   if (parent.score !== Infinity) {
  //     const parentLayer = parent.layer
  //     parentLayer.children = parentLayer.children || []
  //     parentLayer.children.push(layer)
  //   }
  //
  // })
  //
  // console.log("allLayers", allLayers)

  return atoms.map(createHTML).join("\n\n")
}

function component(context, selectedVersion, selectedComponent) {

}

function colors(context) {

}

function textStyles(context) {

}

function spacing(context) {

}

function exportColors(context) {

}

function exportTextStyles(context) {

}

function exportSpacing(context) {

}

/**
 * The following functions will be deprecated. Your extensions can export them to support old versions of Zeplin's macOS app.
 * See Zeplin Extensions migration guide for details:
 * https://zpl.io/shared-styleguides-extensions-migration-guide
 */

function styleguideColors(context, colors) {

}

function styleguideTextStyles(context, textStyles) {

}

function exportStyleguideColors(context, colors) {

}

function exportStyleguideTextStyles(context, textStyles) {

}

function comment(context, text) {

}

export default {
  layer,
  screen,
  component,
  colors,
  textStyles,
  spacing,
  exportColors,
  exportTextStyles,
  exportSpacing,
  styleguideColors,
  styleguideTextStyles,
  exportStyleguideColors,
  exportStyleguideTextStyles,
  comment
}
