import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import proj4 from 'proj4'
import 'leaflet/dist/leaflet.css'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts'

// The source file is labelled CRS84 but its coordinates are UTM metres
// (zone 44N, WGS84). Reproject to lon/lat so Leaflet can draw it.
proj4.defs('EPSG:32644', '+proj=utm +zone=44 +datum=WGS84 +units=m +no_defs')
const reproject = c =>
  typeof c[0] === 'number' ? proj4('EPSG:32644', 'WGS84', [c[0], c[1]]) : c.map(reproject)
const toWgs84 = fc => {
  const probe = JSON.stringify(fc.features[0].geometry.coordinates).match(/-?\d+\.?\d*/)
  if (!probe || Math.abs(Number(probe[0])) <= 180) return fc // already lon/lat
  return {
    ...fc,
    features: fc.features.map(f => ({ ...f, geometry: { ...f.geometry, coordinates: reproject(f.geometry.coordinates) } })),
  }
}

const MALE = '#2b6f9e'
const FEMALE = '#d19a2a'
const nf = new Intl.NumberFormat('en-IN')
const pct = (a, b) => (b ? (a / b) * 100 : 0)

// Census attributes -> derived indicators. `get` receives a properties object
// (a single block, or the summed district).
const INDICATORS = [
  { key: 'pop', label: 'Population', d: 0, get: p => p.TOT_P },
  { key: 'density', label: 'Density (persons / km²)', d: 0, get: p => p.TOT_P / (p.Shape_Area / 1e6) },
  { key: 'lit', label: 'Literacy rate (%)', d: 1, get: p => pct(p.P_LIT, p.TOT_P - p.P_06) },
  { key: 'flit', label: 'Female literacy (%)', d: 1, get: p => pct(p.F_LIT, p.TOT_F - p.F_06) },
  { key: 'sex', label: 'Sex ratio (females per 1,000 males)', d: 0, get: p => (p.TOT_F / p.TOT_M) * 1000 },
  { key: 'child', label: 'Children aged 0–6 (%)', d: 1, get: p => pct(p.P_06, p.TOT_P) },
  { key: 'sc', label: 'Scheduled Caste (%)', d: 1, get: p => pct(p.P_SC, p.TOT_P) },
  { key: 'st', label: 'Scheduled Tribe (%)', d: 1, get: p => pct(p.P_ST, p.TOT_P) },
  { key: 'wpr', label: 'Workers (% of population)', d: 1, get: p => pct(p.TOT_WORK_P, p.TOT_P) },
  { key: 'fwpr', label: 'Female workers (% of women)', d: 1, get: p => pct(p.TOT_WORK_F, p.TOT_F) },
  { key: 'marg', label: 'Marginal workers (% of workers)', d: 1, get: p => pct(p.MARGWORK_P, p.TOT_WORK_P) },
]
const fmt = (ind, v) => v.toLocaleString('en-IN', { minimumFractionDigits: ind.d, maximumFractionDigits: ind.d })

const sumProps = features =>
  features.reduce((acc, { properties: p }) => {
    for (const k in p) if (typeof p[k] === 'number') acc[k] = (acc[k] || 0) + p[k]
    return acc
  }, {})

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const LOW = hex('#6950c2')
const HIGH = hex('#0d4a41')
const ramp = t => `rgb(${LOW.map((c, i) => Math.round(c + (HIGH[i] - c) * t)).join(',')})`

function FitTo({ data, sel }) {
  const map = useMap()
  useEffect(() => {
    const feats = data.features.filter(f => !sel || f.properties.Name === sel)
    map.flyToBounds(L.geoJSON({ type: 'FeatureCollection', features: feats }).getBounds(), { padding: [24, 24], duration: 0.6 })
  }, [data, sel, map])
  return null
}

// "Zoom to layer" button, added to the same bar as the zoom in / zoom out buttons
function ZoomToLayer({ data }) {
  const map = useMap()
  useEffect(() => {
    const bar = map.zoomControl.getContainer()
    const a = L.DomUtil.create('a', 'zoom-layer', bar)
    a.href = '#'
    a.title = 'Zoom to layer'
    a.setAttribute('role', 'button')
    a.setAttribute('aria-label', 'Zoom to layer')
    a.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 5.5v-4h4M10.5 1.5h4v4M14.5 10.5v4h-4M5.5 14.5h-4v-4"/><rect x="5" y="5" width="6" height="6" rx="1"/></svg>'
    L.DomEvent.disableClickPropagation(a)
    L.DomEvent.on(a, 'click', e => {
      L.DomEvent.preventDefault(e)
      map.flyToBounds(L.geoJSON(data).getBounds(), { padding: [24, 24], duration: 0.6 })
    })
    return () => a.remove()
  }, [map, data])
  return null
}

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [indKey, setIndKey] = useState('lit')
  const [sel, setSel] = useState(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}Block_Boundary.geojson`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => setData(toWgs84(d)))
      .catch(e => setError(e.message))
  }, [])

  const ind = INDICATORS.find(i => i.key === indKey)
  const feats = data?.features ?? []
  const district = useMemo(() => sumProps(feats), [data])
  const focus = sel ? feats.find(f => f.properties.Name === sel)?.properties : district
  const distName = feats[0]?.properties.Dist_Name

  const [min, max] = useMemo(() => {
    const v = feats.map(f => ind.get(f.properties))
    return [Math.min(...v), Math.max(...v)]
  }, [data, ind])
  const color = v => ramp(max === min ? 0.5 : (v - min) / (max - min))

  if (error) return <p className="state">Could not load Block_Boundary.geojson ({error}). Check that it is in the public folder.</p>
  if (!data) return <p className="state">Loading block boundaries…</p>

  const literacyData = [
    { name: 'Male', Literate: focus.M_LIT, Illiterate: focus.M_ILL },
    { name: 'Female', Literate: focus.F_LIT, Illiterate: focus.F_ILL },
  ]
  const workData = [
    ['Cultivators', 'CL'], ['Agricultural labourers', 'AL'], ['Household industry', 'HH'], ['Other workers', 'OT'],
  ].map(([name, k]) => ({ name, Male: focus[`MAIN_${k}_M`], Female: focus[`MAIN_${k}_F`] }))

  const kpis = [
    ['Population', nf.format(focus.TOT_P)],
    ['Households', nf.format(focus.No_HH)],
    ['Literacy', `${fmt(INDICATORS[2], INDICATORS[2].get(focus))}%`],
    ['Sex ratio', fmt(INDICATORS[4], INDICATORS[4].get(focus))],
  ]

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>{distName} district</h1>
          <p className="sub">Census block profile · {feats.length} blocks</p>
        </div>
        <div className="chips" role="group" aria-label="Select block">
          <button className={!sel ? 'chip on' : 'chip'} onClick={() => setSel(null)}>All blocks</button>
          {feats.map(f => (
            <button key={f.properties.Name} className={sel === f.properties.Name ? 'chip on' : 'chip'}
              onClick={() => setSel(s => (s === f.properties.Name ? null : f.properties.Name))}>
              {f.properties.Name}
            </button>
          ))}
        </div>
      </header>

      <section className="kpis" aria-label={sel ? `${sel} block summary` : 'District summary'}>
        <h2>{sel ? `${sel} block` : `All ${feats.length} blocks`}</h2>
        {kpis.map(([l, v]) => (
          <div className="kpi" key={l}><span className="kv">{v}</span><span className="kl">{l}</span></div>
        ))}
      </section>

      <main className="grid">
        <section className="panel map-panel">
          <div className="panel-head">
            <label htmlFor="ind">Map shows</label>
            <select id="ind" value={indKey} onChange={e => setIndKey(e.target.value)}>
              {INDICATORS.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
            </select>
          </div>
          <div className="map-wrap">
            <MapContainer center={[29.9, 79.8]} zoom={9} scrollWheelZoom={false} className="map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
              <GeoJSON
                key={indKey + (sel ?? '')}
                data={data}
                style={f => {
                  const on = f.properties.Name === sel
                  return { fillColor: color(ind.get(f.properties)), fillOpacity: 0.88, color: on ? '#d9922b' : '#ffffff', weight: on ? 4 : 1.5 }
                }}
                onEachFeature={(f, layer) => {
                  layer.bindTooltip(`<b>${f.properties.Name}</b><br/>${fmt(ind, ind.get(f.properties))}`, { sticky: true })
                  layer.on('click', () => setSel(s => (s === f.properties.Name ? null : f.properties.Name)))
                }}
              />
              <FitTo data={data} sel={sel} />
              <ZoomToLayer data={data} />
            </MapContainer>
            <div className="legend">
              <span>{fmt(ind, min)}</span>
              <i style={{ background: `linear-gradient(90deg, ${ramp(0)}, ${ramp(1)})` }} />
              <span>{fmt(ind, max)}</span>
            </div>
          </div>
        </section>

        <section className="panel">
          <h3>Compare blocks</h3>
          <p className="hint">Select a row to map that indicator.</p>
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Indicator</th>{feats.map(f => <th key={f.properties.Name} className={sel === f.properties.Name ? 'hl' : ''}>{f.properties.Name}</th>)}<th>District</th></tr>
              </thead>
              <tbody>
                {INDICATORS.map(i => (
                  <tr key={i.key} className={i.key === indKey ? 'active' : ''}>
                    <th scope="row"><button onClick={() => setIndKey(i.key)}>{i.label}</button></th>
                    {feats.map(f => <td key={f.properties.Name} className={sel === f.properties.Name ? 'hl' : ''}>{fmt(i, i.get(f.properties))}</td>)}
                    <td>{fmt(i, i.get(district))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h3>Literacy by gender</h3>
          <p className="hint">Persons, Census count</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={literacyData} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} stroke="#dfe7e4" />
              <XAxis dataKey="name" tickLine={false} />
              <YAxis tickFormatter={v => `${Math.round(v / 1000)}k`} axisLine={false} tickLine={false} width={44} />
              <Tooltip formatter={v => nf.format(v)} />
              <Legend />
              <Bar dataKey="Literate" stackId="a" fill="#0f4c43" />
              <Bar dataKey="Illiterate" stackId="a" fill="#000000" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <h3>Main workers by sector</h3>
          <p className="hint">Split by gender</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={workData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} stroke="#dfe7e4" />
              <XAxis type="number" tickFormatter={v => `${Math.round(v / 1000)}k`} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} />
              <Tooltip formatter={v => nf.format(v)} />
              <Legend />
              <Bar dataKey="Male" stackId="w" fill={MALE} />
              <Bar dataKey="Female" stackId="w" fill={FEMALE} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </main>
    </div>
  )
}
