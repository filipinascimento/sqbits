const w = {
  layout: "force3d",
  // 'force3d' | 'jitter'
  mode: "2d",
  // '2d' | '3d'
  center: [0, 0, 0],
  radius: 150,
  depth: 0,
  jitter: 3,
  // Force-directed controls
  repulsionExponent: 2,
  attractionExponent: 1,
  kRepulsion: 6,
  kAttraction: 35e-4,
  kGravity: 5e-4,
  epsilon: 0.25,
  minDistance: 0.25,
  maxForce: 50,
  maxStep: 3,
  eta: 0.04,
  damping: 0.9,
  theta: 0.6,
  leafSize: 16,
  repulsionStrategy: "barnes-hut",
  // 'barnes-hut' | 'negative' | 'full'
  negativeSampling: !1,
  negativesPerNode: 48,
  recenter: !0
}, F = 3, n = {
  nodeCount: 0,
  options: { ...w },
  seeded: !1,
  lastTimestamp: 0,
  velocities: null,
  forces: null,
  edges: new Uint32Array(0),
  nodeIndices: null
};
self.onmessage = (t) => {
  const o = t.data;
  if (o) {
    if (o.type === "init") {
      n.nodeCount = o.nodeCount ?? 0, n.options = { ...w, ...n.options, ...o.options }, n.seeded = !1, n.lastTimestamp = 0, n.velocities = new Float32Array(n.nodeCount * 3), n.forces = new Float32Array(n.nodeCount * 3), self.postMessage({ type: "ready" });
      return;
    }
    if (o.type === "resize") {
      const s = o.center ?? n.options.center ?? [0, 0];
      n.options.center = [s[0] ?? 0, s[1] ?? 0, n.options.center?.[2] ?? 0];
      return;
    }
    if (o.type === "settings") {
      n.options = { ...n.options, ...o.options ?? {} };
      return;
    }
    o.type === "tick" && o.positions instanceof Float32Array && X(o);
  }
};
function X(t) {
  if (!(t.positions instanceof Float32Array)) return;
  if (t.options && (n.options = { ...n.options, ...t.options }), t.edges instanceof Uint32Array && (n.edges = t.edges), t.nodeIndices instanceof Uint32Array && (n.nodeIndices = t.nodeIndices), (n.options.layout || "force3d").toLowerCase() === "jitter") {
    Y(t.positions, t.timestamp ?? performance.now());
    return;
  }
  Z(t.positions, t.timestamp ?? performance.now());
}
function Y(t, o) {
  const { radius: s, jitter: i, center: c = [0, 0], depth: r = 0, mode: a = "2d" } = n.options, m = F, l = t.length / m, p = c[0] ?? 0, e = c[1] ?? 0, d = a === "3d" ? r : 0;
  if (!n.seeded) {
    for (let z = 0; z < l; z += 1) {
      const y = z * m;
      t[y] = p + (Math.random() - 0.5) * s, t[y + 1] = e + (Math.random() - 0.5) * s, t[y + 2] = (Math.random() - 0.5) * d;
    }
    n.seeded = !0, n.lastTimestamp = o ?? performance.now(), self.postMessage({ type: "positions", positions: t, timestamp: n.lastTimestamp }, [t.buffer]);
    return;
  }
  const x = o || performance.now(), g = n.lastTimestamp || x, f = Math.max(1, x - g);
  n.lastTimestamp = x;
  const A = Math.min(0.1, Math.max(8e-3, f * 1e-3)) * 60, h = i * A, u = 0 * A;
  for (let z = 0; z < l; z += 1) {
    const y = z * m;
    t[y] += (Math.random() - 0.5) * h + (p - t[y]) * u, t[y + 1] += (Math.random() - 0.5) * h + (e - t[y + 1]) * u, t[y + 2] += (Math.random() - 0.5) * h * (d ? 1 : 0) - t[y + 2] * u;
  }
  self.postMessage({ type: "positions", positions: t, timestamp: n.lastTimestamp }, [t.buffer]);
}
function Z(t, o) {
  const s = F, i = t.length / s;
  (!n.velocities || n.velocities.length < i * 3) && (n.velocities = new Float32Array(i * 3)), (!n.forces || n.forces.length < i * 3) && (n.forces = new Float32Array(i * 3));
  const c = (n.options.mode ?? "2d") === "3d", r = B(n.nodeIndices, i);
  if (!n.seeded) {
    H(t, r, c), n.seeded = !0, n.lastTimestamp = o ?? performance.now(), self.postMessage({ type: "positions", positions: t, timestamp: n.lastTimestamp }, [t.buffer]);
    return;
  }
  const { timeScale: a } = J(o), m = (n.options.eta ?? w.eta) * a, l = ot(n.options.damping ?? w.damping);
  _(n.forces, i), K(t, r, c), N(t, r, c), b(t, r, c), tt(t, r, c, m, l), n.options.recenter !== !1 && nt(t, r, c), n.lastTimestamp = o, self.postMessage({ type: "positions", positions: t, timestamp: n.lastTimestamp }, [t.buffer]);
}
function B(t, o) {
  if (t instanceof Uint32Array || Array.isArray(t))
    return t;
  const s = new Uint32Array(o);
  for (let i = 0; i < o; i += 1)
    s[i] = i;
  return s;
}
function H(t, o, s) {
  const i = F, { radius: c, depth: r, center: a } = n.options, m = a?.[2] ?? 0;
  for (let l = 0; l < o.length; l += 1) {
    const e = o[l] * i;
    t[e] = (a?.[0] ?? 0) + (Math.random() - 0.5) * c, t[e + 1] = (a?.[1] ?? 0) + (Math.random() - 0.5) * c, t[e + 2] = m + (Math.random() - 0.5) * (s ? r : 0);
  }
}
function J(t) {
  const o = t || performance.now(), s = n.lastTimestamp || o, i = Math.max(1, o - s), c = Math.min(0.05, Math.max(8e-3, i * 1e-3));
  return {
    dt: c,
    timeScale: c * 60
  };
}
function _(t, o) {
  const s = o * 3;
  if (!(t.length < s))
    for (let i = 0; i < s; i += 1)
      t[i] = 0;
}
function K(t, o, s) {
  if (o.length < 2) return;
  const i = (n.options.repulsionStrategy || w.repulsionStrategy).toLowerCase();
  if (i === "negative") {
    G(t, o, s, 1);
    return;
  }
  if (i === "full" || o.length <= 32) {
    Q(t, o, s);
    return;
  }
  V(t, o, s), n.options.negativeSampling && G(t, o, s, 0.5);
}
function Q(t, o, s) {
  const i = F, c = n.options.repulsionExponent ?? w.repulsionExponent, r = n.options.kRepulsion ?? w.kRepulsion, a = n.options.epsilon ?? w.epsilon, m = n.options.minDistance ?? w.minDistance;
  for (let l = 0; l < o.length; l += 1) {
    const p = o[l], e = p * i, d = t[e], x = t[e + 1], g = s ? t[e + 2] : 0;
    for (let f = l + 1; f < o.length; f += 1) {
      const M = o[f], A = M * i, h = d - t[A], u = x - t[A + 1], z = s ? g - t[A + 2] : 0, y = h * h + u * u + z * z, R = Math.max(Math.sqrt(y), m) + a, S = r / Math.pow(R, c + 1), E = h * S, k = u * S, L = z * S, I = p * 3, T = M * 3;
      n.forces[I] += E, n.forces[I + 1] += k, n.forces[I + 2] += L, n.forces[T] -= E, n.forces[T + 1] -= k, n.forces[T + 2] -= L;
    }
  }
}
function G(t, o, s, i) {
  const c = F, r = n.options.repulsionExponent ?? w.repulsionExponent, a = (n.options.kRepulsion ?? w.kRepulsion) * i, m = n.options.epsilon ?? w.epsilon, l = n.options.minDistance ?? w.minDistance, p = Math.max(1, Math.floor(n.options.negativesPerNode ?? w.negativesPerNode)), e = o.length;
  for (let d = 0; d < e; d += 1) {
    const x = o[d], g = x * c, f = t[g], M = t[g + 1], A = s ? t[g + 2] : 0;
    let h = 0, u = 0, z = 0;
    for (let R = 0; R < p; R += 1) {
      let S = Math.floor(Math.random() * e);
      S === d && (S = (S + 1) % e);
      const k = o[S] * c, L = f - t[k], I = M - t[k + 1], T = s ? A - t[k + 2] : 0, v = L * L + I * I + T * T, C = Math.max(Math.sqrt(v), l) + m, q = a / Math.pow(C, r + 1);
      h += L * q, u += I * q, z += T * q;
    }
    const y = (e - 1) / p, j = x * 3;
    n.forces[j] += h * y, n.forces[j + 1] += u * y, n.forces[j + 2] += z * y;
  }
}
function V(t, o, s) {
  if (o.length === 0) return;
  const i = W(t, o, s), c = F, r = n.options.repulsionExponent ?? w.repulsionExponent, a = n.options.kRepulsion ?? w.kRepulsion, m = n.options.epsilon ?? w.epsilon, l = n.options.minDistance ?? w.minDistance;
  for (let p = 0; p < o.length; p += 1) {
    const e = o[p], d = e * c, x = t[d], g = t[d + 1], f = s ? t[d + 2] : 0, M = [0];
    for (; M.length > 0; ) {
      const A = M.pop(), h = i[A];
      if (!h || h.mass === 0) continue;
      if (h.isLeaf) {
        for (let S = 0; S < h.indices.length; S += 1) {
          const E = h.indices[S];
          if (E === e) continue;
          const k = E * c, L = x - t[k], I = g - t[k + 1], T = s ? f - t[k + 2] : 0, P = Math.max(Math.sqrt(L * L + I * I + T * T), l) + m, C = a / Math.pow(P, r + 1), q = e * 3;
          n.forces[q] += L * C, n.forces[q + 1] += I * C, n.forces[q + 2] += T * C;
        }
        continue;
      }
      const u = x - h.com[0], z = g - h.com[1], y = s ? f - h.com[2] : 0, j = Math.max(Math.sqrt(u * u + z * z + y * y), l);
      if ((h.size || 1) / j < (n.options.theta ?? w.theta)) {
        const S = j + m, E = a * h.mass / Math.pow(S, r + 1), k = e * 3;
        n.forces[k] += u * E, n.forces[k + 1] += z * E, n.forces[k + 2] += y * E;
      } else
        for (let S = 0; S < h.children.length; S += 1) {
          const E = h.children[S];
          E !== -1 && M.push(E);
        }
    }
  }
}
function W(t, o, s) {
  const i = F;
  let c = 1 / 0, r = 1 / 0, a = 1 / 0, m = -1 / 0, l = -1 / 0, p = -1 / 0;
  for (let f = 0; f < o.length; f += 1) {
    const M = o[f] * i, A = t[M], h = t[M + 1], u = s ? t[M + 2] : 0;
    A < c && (c = A), h < r && (r = h), u < a && (a = u), A > m && (m = A), h > l && (l = h), u > p && (p = u);
  }
  const e = Math.max(m - c, l - r, p - a, n.options.minDistance || 1), d = e * 0.5 || 1, g = [
    {
      center: [(c + m) * 0.5 || 0, (r + l) * 0.5 || 0, (a + p) * 0.5 || 0],
      half: d,
      size: e,
      children: new Array(8).fill(-1),
      indices: [],
      isLeaf: !0,
      mass: 0,
      com: [0, 0, 0]
    }
  ];
  for (let f = 0; f < o.length; f += 1)
    O(g, 0, o[f], t, s, 0);
  return U(0, g, t, s), g;
}
function O(t, o, s, i, c, r) {
  const a = t[o];
  if (a.isLeaf && (a.indices.length < (n.options.leafSize ?? w.leafSize) || r > 18)) {
    a.indices.push(s);
    return;
  }
  if (a.isLeaf) {
    $(t, o);
    const l = a.indices.slice();
    a.indices.length = 0;
    for (let p = 0; p < l.length; p += 1)
      O(t, o, l[p], i, c, r + 1);
  }
  const m = D(a, s, i, c);
  O(t, m, s, i, c, r + 1);
}
function $(t, o) {
  const s = t[o], i = s.half * 0.5, c = [
    [-1, -1, -1],
    [1, -1, -1],
    [-1, 1, -1],
    [1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [-1, 1, 1],
    [1, 1, 1]
  ];
  for (let r = 0; r < 8; r += 1) {
    const [a, m, l] = c[r], p = [s.center[0] + a * i, s.center[1] + m * i, s.center[2] + l * i];
    t.push({
      center: p,
      half: i,
      size: s.half,
      children: new Array(8).fill(-1),
      indices: [],
      isLeaf: !0,
      mass: 0,
      com: [0, 0, 0]
    }), s.children[r] = t.length - 1;
  }
  s.isLeaf = !1;
}
function D(t, o, s, i) {
  const r = o * F, a = s[r], m = s[r + 1], l = i ? s[r + 2] : 0, p = a >= t.center[0] ? 1 : 0, e = m >= t.center[1] ? 1 : 0, x = (l >= t.center[2] ? 1 : 0) << 2 | e << 1 | p;
  return t.children[x];
}
function U(t, o, s, i) {
  const c = o[t];
  if (c.isLeaf) {
    const p = F, e = c.indices.length;
    if (!e)
      return c.mass = 0, c.com = [0, 0, 0], 0;
    let d = 0, x = 0, g = 0;
    for (let f = 0; f < e; f += 1) {
      const M = c.indices[f] * p;
      d += s[M], x += s[M + 1], g += i ? s[M + 2] : 0;
    }
    return c.mass = e, c.com = [d / e, x / e, g / e], e;
  }
  let r = 0, a = 0, m = 0, l = 0;
  for (let p = 0; p < c.children.length; p += 1) {
    const e = c.children[p];
    if (e === -1) continue;
    const d = U(e, o, s, i), x = o[e];
    d > 0 && (r += d, a += x.com[0] * d, m += x.com[1] * d, l += x.com[2] * d);
  }
  return c.mass = r, r > 0 ? c.com = [a / r, m / r, l / r] : c.com = [0, 0, 0], r;
}
function N(t, o, s) {
  if (!n.edges || n.edges.length === 0) return;
  const i = F, c = n.options.attractionExponent ?? w.attractionExponent, r = n.options.kAttraction ?? w.kAttraction, a = n.options.minDistance ?? w.minDistance, m = n.edges.length / 2, l = n.nodeActivity;
  for (let p = 0; p < m; p += 1) {
    const e = n.edges[p * 2], d = n.edges[p * 2 + 1];
    if (l && (!l[e] || !l[d])) continue;
    const x = e * i, g = d * i, f = t[x] - t[g], M = t[x + 1] - t[g + 1], A = s ? t[x + 2] - t[g + 2] : 0, h = Math.max(Math.sqrt(f * f + M * M + A * A), a), u = -r * Math.pow(h, c - 1), z = f * u, y = M * u, j = A * u, R = e * 3, S = d * 3;
    n.forces[R] += z, n.forces[R + 1] += y, n.forces[R + 2] += j, n.forces[S] -= z, n.forces[S + 1] -= y, n.forces[S + 2] -= j;
  }
}
function b(t, o, s) {
  const i = n.options.kGravity ?? w.kGravity;
  if (!i) return;
  const c = n.options.center?.[0] ?? 0, r = n.options.center?.[1] ?? 0, a = n.options.center?.[2] ?? 0, m = F;
  for (let l = 0; l < o.length; l += 1) {
    const p = o[l], e = p * m, d = t[e] - c, x = t[e + 1] - r, g = s ? t[e + 2] - a : 0, f = p * 3;
    n.forces[f] -= i * d, n.forces[f + 1] -= i * x, n.forces[f + 2] -= i * g;
  }
}
function tt(t, o, s, i, c) {
  const r = n.options.maxForce ?? w.maxForce, a = n.options.maxStep ?? w.maxStep, m = F;
  for (let l = 0; l < o.length; l += 1) {
    const p = o[l], e = p * 3;
    let d = n.forces[e], x = n.forces[e + 1], g = s ? n.forces[e + 2] : 0;
    const f = Math.sqrt(d * d + x * x + g * g);
    if (r > 0 && f > r) {
      const y = r / (f + 1e-9);
      d *= y, x *= y, g *= y;
    }
    let M = (n.velocities[e] ?? 0) * c + i * d, A = (n.velocities[e + 1] ?? 0) * c + i * x, h = s ? (n.velocities[e + 2] ?? 0) * c + i * g : 0;
    const u = Math.sqrt(M * M + A * A + h * h);
    if (a > 0 && u > a) {
      const y = a / (u + 1e-9);
      M *= y, A *= y, h *= y;
    }
    n.velocities[e] = M, n.velocities[e + 1] = A, n.velocities[e + 2] = h;
    const z = p * m;
    t[z] += M, t[z + 1] += A, t[z + 2] = s ? t[z + 2] + h : 0;
  }
}
function nt(t, o, s) {
  if (!o.length) return;
  const i = F;
  let c = 0, r = 0, a = 0;
  for (let e = 0; e < o.length; e += 1) {
    const d = o[e] * i;
    c += t[d], r += t[d + 1], a += s ? t[d + 2] : 0;
  }
  c /= o.length, r /= o.length, a = s ? a / o.length : 0;
  const m = n.options.center?.[0] ?? 0, l = n.options.center?.[1] ?? 0, p = n.options.center?.[2] ?? 0;
  for (let e = 0; e < o.length; e += 1) {
    const d = o[e] * i;
    t[d] += m - c, t[d + 1] += l - r, t[d + 2] = s ? t[d + 2] + p - a : 0;
  }
}
function ot(t) {
  return Math.min(1, Math.max(0, t));
}
//# sourceMappingURL=layoutWorker-BbqyYAty.js.map
