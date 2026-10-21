function Rt(t, n, e) {
  var i, r = 1;
  t == null && (t = 0), n == null && (n = 0), e == null && (e = 0);
  function s() {
    var o, f = i.length, a, h = 0, u = 0, l = 0;
    for (o = 0; o < f; ++o)
      a = i[o], h += a.x || 0, u += a.y || 0, l += a.z || 0;
    for (h = (h / f - t) * r, u = (u / f - n) * r, l = (l / f - e) * r, o = 0; o < f; ++o)
      a = i[o], h && (a.x -= h), u && (a.y -= u), l && (a.z -= l);
  }
  return s.initialize = function(o) {
    i = o;
  }, s.x = function(o) {
    return arguments.length ? (t = +o, s) : t;
  }, s.y = function(o) {
    return arguments.length ? (n = +o, s) : n;
  }, s.z = function(o) {
    return arguments.length ? (e = +o, s) : e;
  }, s.strength = function(o) {
    return arguments.length ? (r = +o, s) : r;
  }, s;
}
function Xt(t) {
  var n = +this._x.call(null, t);
  return qt(this.cover(n), n, t);
}
function qt(t, n, e) {
  if (isNaN(n)) return t;
  var i, r = t._root, s = { data: e }, o = t._x0, f = t._x1, a, h, u, l, _;
  if (!r) return t._root = s, t;
  for (; r.length; )
    if ((u = n >= (a = (o + f) / 2)) ? o = a : f = a, i = r, !(r = r[l = +u])) return i[l] = s, t;
  if (h = +t._x.call(null, r.data), n === h) return s.next = r, i ? i[l] = s : t._root = s, t;
  do
    i = i ? i[l] = new Array(2) : t._root = new Array(2), (u = n >= (a = (o + f) / 2)) ? o = a : f = a;
  while ((l = +u) == (_ = +(h >= a)));
  return i[_] = r, i[l] = s, t;
}
function Lt(t) {
  var n, e = t.length, i, r = new Array(e), s = 1 / 0, o = -1 / 0;
  for (n = 0; n < e; ++n)
    isNaN(i = +this._x.call(null, t[n])) || (r[n] = i, i < s && (s = i), i > o && (o = i));
  if (s > o) return this;
  for (this.cover(s).cover(o), n = 0; n < e; ++n)
    qt(this, r[n], t[n]);
  return this;
}
function Yt(t) {
  if (isNaN(t = +t)) return this;
  var n = this._x0, e = this._x1;
  if (isNaN(n))
    e = (n = Math.floor(t)) + 1;
  else {
    for (var i = e - n || 1, r = this._root, s, o; n > t || t >= e; )
      switch (o = +(t < n), s = new Array(2), s[o] = r, r = s, i *= 2, o) {
        case 0:
          e = n + i;
          break;
        case 1:
          n = e - i;
          break;
      }
    this._root && this._root.length && (this._root = r);
  }
  return this._x0 = n, this._x1 = e, this;
}
function Ht() {
  var t = [];
  return this.visit(function(n) {
    if (!n.length) do
      t.push(n.data);
    while (n = n.next);
  }), t;
}
function Qt(t) {
  return arguments.length ? this.cover(+t[0][0]).cover(+t[1][0]) : isNaN(this._x0) ? void 0 : [[this._x0], [this._x1]];
}
function L(t, n, e) {
  this.node = t, this.x0 = n, this.x1 = e;
}
function Zt(t, n) {
  var e, i = this._x0, r, s, o = this._x1, f = [], a = this._root, h, u;
  for (a && f.push(new L(a, i, o)), n == null ? n = 1 / 0 : (i = t - n, o = t + n); h = f.pop(); )
    if (!(!(a = h.node) || (r = h.x0) > o || (s = h.x1) < i))
      if (a.length) {
        var l = (r + s) / 2;
        f.push(
          new L(a[1], l, s),
          new L(a[0], r, l)
        ), (u = +(t >= l)) && (h = f[f.length - 1], f[f.length - 1] = f[f.length - 1 - u], f[f.length - 1 - u] = h);
      } else {
        var _ = Math.abs(t - +this._x.call(null, a.data));
        _ < n && (n = _, i = t - _, o = t + _, e = a.data);
      }
  return e;
}
function Gt(t) {
  if (isNaN(a = +this._x.call(null, t))) return this;
  var n, e = this._root, i, r, s, o = this._x0, f = this._x1, a, h, u, l, _;
  if (!e) return this;
  if (e.length) for (; ; ) {
    if ((u = a >= (h = (o + f) / 2)) ? o = h : f = h, n = e, !(e = e[l = +u])) return this;
    if (!e.length) break;
    n[l + 1 & 1] && (i = n, _ = l);
  }
  for (; e.data !== t; ) if (r = e, !(e = e.next)) return this;
  return (s = e.next) && delete e.next, r ? (s ? r.next = s : delete r.next, this) : n ? (s ? n[l] = s : delete n[l], (e = n[0] || n[1]) && e === (n[1] || n[0]) && !e.length && (i ? i[_] = e : this._root = e), this) : (this._root = s, this);
}
function Ut(t) {
  for (var n = 0, e = t.length; n < e; ++n) this.remove(t[n]);
  return this;
}
function Vt() {
  return this._root;
}
function Jt() {
  var t = 0;
  return this.visit(function(n) {
    if (!n.length) do
      ++t;
    while (n = n.next);
  }), t;
}
function Kt(t) {
  var n = [], e, i = this._root, r, s, o;
  for (i && n.push(new L(i, this._x0, this._x1)); e = n.pop(); )
    if (!t(i = e.node, s = e.x0, o = e.x1) && i.length) {
      var f = (s + o) / 2;
      (r = i[1]) && n.push(new L(r, f, o)), (r = i[0]) && n.push(new L(r, s, f));
    }
  return this;
}
function Wt(t) {
  var n = [], e = [], i;
  for (this._root && n.push(new L(this._root, this._x0, this._x1)); i = n.pop(); ) {
    var r = i.node;
    if (r.length) {
      var s, o = i.x0, f = i.x1, a = (o + f) / 2;
      (s = r[0]) && n.push(new L(s, o, a)), (s = r[1]) && n.push(new L(s, a, f));
    }
    e.push(i);
  }
  for (; i = e.pop(); )
    t(i.node, i.x0, i.x1);
  return this;
}
function tn(t) {
  return t[0];
}
function nn(t) {
  return arguments.length ? (this._x = t, this) : this._x;
}
function gt(t, n) {
  var e = new vt(n ?? tn, NaN, NaN);
  return t == null ? e : e.addAll(t);
}
function vt(t, n, e) {
  this._x = t, this._x0 = n, this._x1 = e, this._root = void 0;
}
function wt(t) {
  for (var n = { data: t.data }, e = n; t = t.next; ) e = e.next = { data: t.data };
  return n;
}
var T = gt.prototype = vt.prototype;
T.copy = function() {
  var t = new vt(this._x, this._x0, this._x1), n = this._root, e, i;
  if (!n) return t;
  if (!n.length) return t._root = wt(n), t;
  for (e = [{ source: n, target: t._root = new Array(2) }]; n = e.pop(); )
    for (var r = 0; r < 2; ++r)
      (i = n.source[r]) && (i.length ? e.push({ source: i, target: n.target[r] = new Array(2) }) : n.target[r] = wt(i));
  return t;
};
T.add = Xt;
T.addAll = Lt;
T.cover = Yt;
T.data = Ht;
T.extent = Qt;
T.find = Zt;
T.remove = Gt;
T.removeAll = Ut;
T.root = Vt;
T.size = Jt;
T.visit = Kt;
T.visitAfter = Wt;
T.x = nn;
function en(t) {
  const n = +this._x.call(null, t), e = +this._y.call(null, t);
  return kt(this.cover(n, e), n, e, t);
}
function kt(t, n, e, i) {
  if (isNaN(n) || isNaN(e)) return t;
  var r, s = t._root, o = { data: i }, f = t._x0, a = t._y0, h = t._x1, u = t._y1, l, _, y, M, p, x, g, z;
  if (!s) return t._root = o, t;
  for (; s.length; )
    if ((p = n >= (l = (f + h) / 2)) ? f = l : h = l, (x = e >= (_ = (a + u) / 2)) ? a = _ : u = _, r = s, !(s = s[g = x << 1 | p])) return r[g] = o, t;
  if (y = +t._x.call(null, s.data), M = +t._y.call(null, s.data), n === y && e === M) return o.next = s, r ? r[g] = o : t._root = o, t;
  do
    r = r ? r[g] = new Array(4) : t._root = new Array(4), (p = n >= (l = (f + h) / 2)) ? f = l : h = l, (x = e >= (_ = (a + u) / 2)) ? a = _ : u = _;
  while ((g = x << 1 | p) === (z = (M >= _) << 1 | y >= l));
  return r[z] = s, r[g] = o, t;
}
function rn(t) {
  var n, e, i = t.length, r, s, o = new Array(i), f = new Array(i), a = 1 / 0, h = 1 / 0, u = -1 / 0, l = -1 / 0;
  for (e = 0; e < i; ++e)
    isNaN(r = +this._x.call(null, n = t[e])) || isNaN(s = +this._y.call(null, n)) || (o[e] = r, f[e] = s, r < a && (a = r), r > u && (u = r), s < h && (h = s), s > l && (l = s));
  if (a > u || h > l) return this;
  for (this.cover(a, h).cover(u, l), e = 0; e < i; ++e)
    kt(this, o[e], f[e], t[e]);
  return this;
}
function sn(t, n) {
  if (isNaN(t = +t) || isNaN(n = +n)) return this;
  var e = this._x0, i = this._y0, r = this._x1, s = this._y1;
  if (isNaN(e))
    r = (e = Math.floor(t)) + 1, s = (i = Math.floor(n)) + 1;
  else {
    for (var o = r - e || 1, f = this._root, a, h; e > t || t >= r || i > n || n >= s; )
      switch (h = (n < i) << 1 | t < e, a = new Array(4), a[h] = f, f = a, o *= 2, h) {
        case 0:
          r = e + o, s = i + o;
          break;
        case 1:
          e = r - o, s = i + o;
          break;
        case 2:
          r = e + o, i = s - o;
          break;
        case 3:
          e = r - o, i = s - o;
          break;
      }
    this._root && this._root.length && (this._root = f);
  }
  return this._x0 = e, this._y0 = i, this._x1 = r, this._y1 = s, this;
}
function on() {
  var t = [];
  return this.visit(function(n) {
    if (!n.length) do
      t.push(n.data);
    while (n = n.next);
  }), t;
}
function an(t) {
  return arguments.length ? this.cover(+t[0][0], +t[0][1]).cover(+t[1][0], +t[1][1]) : isNaN(this._x0) ? void 0 : [[this._x0, this._y0], [this._x1, this._y1]];
}
function E(t, n, e, i, r) {
  this.node = t, this.x0 = n, this.y0 = e, this.x1 = i, this.y1 = r;
}
function fn(t, n, e) {
  var i, r = this._x0, s = this._y0, o, f, a, h, u = this._x1, l = this._y1, _ = [], y = this._root, M, p;
  for (y && _.push(new E(y, r, s, u, l)), e == null ? e = 1 / 0 : (r = t - e, s = n - e, u = t + e, l = n + e, e *= e); M = _.pop(); )
    if (!(!(y = M.node) || (o = M.x0) > u || (f = M.y0) > l || (a = M.x1) < r || (h = M.y1) < s))
      if (y.length) {
        var x = (o + a) / 2, g = (f + h) / 2;
        _.push(
          new E(y[3], x, g, a, h),
          new E(y[2], o, g, x, h),
          new E(y[1], x, f, a, g),
          new E(y[0], o, f, x, g)
        ), (p = (n >= g) << 1 | t >= x) && (M = _[_.length - 1], _[_.length - 1] = _[_.length - 1 - p], _[_.length - 1 - p] = M);
      } else {
        var z = t - +this._x.call(null, y.data), w = n - +this._y.call(null, y.data), N = z * z + w * w;
        if (N < e) {
          var c = Math.sqrt(e = N);
          r = t - c, s = n - c, u = t + c, l = n + c, i = y.data;
        }
      }
  return i;
}
function hn(t) {
  if (isNaN(u = +this._x.call(null, t)) || isNaN(l = +this._y.call(null, t))) return this;
  var n, e = this._root, i, r, s, o = this._x0, f = this._y0, a = this._x1, h = this._y1, u, l, _, y, M, p, x, g;
  if (!e) return this;
  if (e.length) for (; ; ) {
    if ((M = u >= (_ = (o + a) / 2)) ? o = _ : a = _, (p = l >= (y = (f + h) / 2)) ? f = y : h = y, n = e, !(e = e[x = p << 1 | M])) return this;
    if (!e.length) break;
    (n[x + 1 & 3] || n[x + 2 & 3] || n[x + 3 & 3]) && (i = n, g = x);
  }
  for (; e.data !== t; ) if (r = e, !(e = e.next)) return this;
  return (s = e.next) && delete e.next, r ? (s ? r.next = s : delete r.next, this) : n ? (s ? n[x] = s : delete n[x], (e = n[0] || n[1] || n[2] || n[3]) && e === (n[3] || n[2] || n[1] || n[0]) && !e.length && (i ? i[g] = e : this._root = e), this) : (this._root = s, this);
}
function ln(t) {
  for (var n = 0, e = t.length; n < e; ++n) this.remove(t[n]);
  return this;
}
function un() {
  return this._root;
}
function cn() {
  var t = 0;
  return this.visit(function(n) {
    if (!n.length) do
      ++t;
    while (n = n.next);
  }), t;
}
function gn(t) {
  var n = [], e, i = this._root, r, s, o, f, a;
  for (i && n.push(new E(i, this._x0, this._y0, this._x1, this._y1)); e = n.pop(); )
    if (!t(i = e.node, s = e.x0, o = e.y0, f = e.x1, a = e.y1) && i.length) {
      var h = (s + f) / 2, u = (o + a) / 2;
      (r = i[3]) && n.push(new E(r, h, u, f, a)), (r = i[2]) && n.push(new E(r, s, u, h, a)), (r = i[1]) && n.push(new E(r, h, o, f, u)), (r = i[0]) && n.push(new E(r, s, o, h, u));
    }
  return this;
}
function vn(t) {
  var n = [], e = [], i;
  for (this._root && n.push(new E(this._root, this._x0, this._y0, this._x1, this._y1)); i = n.pop(); ) {
    var r = i.node;
    if (r.length) {
      var s, o = i.x0, f = i.y0, a = i.x1, h = i.y1, u = (o + a) / 2, l = (f + h) / 2;
      (s = r[0]) && n.push(new E(s, o, f, u, l)), (s = r[1]) && n.push(new E(s, u, f, a, l)), (s = r[2]) && n.push(new E(s, o, l, u, h)), (s = r[3]) && n.push(new E(s, u, l, a, h));
    }
    e.push(i);
  }
  for (; i = e.pop(); )
    t(i.node, i.x0, i.y0, i.x1, i.y1);
  return this;
}
function _n(t) {
  return t[0];
}
function pn(t) {
  return arguments.length ? (this._x = t, this) : this._x;
}
function xn(t) {
  return t[1];
}
function yn(t) {
  return arguments.length ? (this._y = t, this) : this._y;
}
function _t(t, n, e) {
  var i = new pt(n ?? _n, e ?? xn, NaN, NaN, NaN, NaN);
  return t == null ? i : i.addAll(t);
}
function pt(t, n, e, i, r, s) {
  this._x = t, this._y = n, this._x0 = e, this._y0 = i, this._x1 = r, this._y1 = s, this._root = void 0;
}
function dt(t) {
  for (var n = { data: t.data }, e = n; t = t.next; ) e = e.next = { data: t.data };
  return n;
}
var S = _t.prototype = pt.prototype;
S.copy = function() {
  var t = new pt(this._x, this._y, this._x0, this._y0, this._x1, this._y1), n = this._root, e, i;
  if (!n) return t;
  if (!n.length) return t._root = dt(n), t;
  for (e = [{ source: n, target: t._root = new Array(4) }]; n = e.pop(); )
    for (var r = 0; r < 4; ++r)
      (i = n.source[r]) && (i.length ? e.push({ source: i, target: n.target[r] = new Array(4) }) : n.target[r] = dt(i));
  return t;
};
S.add = en;
S.addAll = rn;
S.cover = sn;
S.data = on;
S.extent = an;
S.find = fn;
S.remove = hn;
S.removeAll = ln;
S.root = un;
S.size = cn;
S.visit = gn;
S.visitAfter = vn;
S.x = pn;
S.y = yn;
function wn(t) {
  var n = +this._x.call(null, t), e = +this._y.call(null, t), i = +this._z.call(null, t);
  return Dt(this.cover(n, e, i), n, e, i, t);
}
function Dt(t, n, e, i, r) {
  if (isNaN(n) || isNaN(e) || isNaN(i)) return t;
  var s, o = t._root, f = { data: r }, a = t._x0, h = t._y0, u = t._z0, l = t._x1, _ = t._y1, y = t._z1, M, p, x, g, z, w, N, c, d, m, F;
  if (!o) return t._root = f, t;
  for (; o.length; )
    if ((N = n >= (M = (a + l) / 2)) ? a = M : l = M, (c = e >= (p = (h + _) / 2)) ? h = p : _ = p, (d = i >= (x = (u + y) / 2)) ? u = x : y = x, s = o, !(o = o[m = d << 2 | c << 1 | N])) return s[m] = f, t;
  if (g = +t._x.call(null, o.data), z = +t._y.call(null, o.data), w = +t._z.call(null, o.data), n === g && e === z && i === w) return f.next = o, s ? s[m] = f : t._root = f, t;
  do
    s = s ? s[m] = new Array(8) : t._root = new Array(8), (N = n >= (M = (a + l) / 2)) ? a = M : l = M, (c = e >= (p = (h + _) / 2)) ? h = p : _ = p, (d = i >= (x = (u + y) / 2)) ? u = x : y = x;
  while ((m = d << 2 | c << 1 | N) === (F = (w >= x) << 2 | (z >= p) << 1 | g >= M));
  return s[F] = o, s[m] = f, t;
}
function dn(t) {
  var n, e, i = t.length, r, s, o, f = new Array(i), a = new Array(i), h = new Array(i), u = 1 / 0, l = 1 / 0, _ = 1 / 0, y = -1 / 0, M = -1 / 0, p = -1 / 0;
  for (e = 0; e < i; ++e)
    isNaN(r = +this._x.call(null, n = t[e])) || isNaN(s = +this._y.call(null, n)) || isNaN(o = +this._z.call(null, n)) || (f[e] = r, a[e] = s, h[e] = o, r < u && (u = r), r > y && (y = r), s < l && (l = s), s > M && (M = s), o < _ && (_ = o), o > p && (p = o));
  if (u > y || l > M || _ > p) return this;
  for (this.cover(u, l, _).cover(y, M, p), e = 0; e < i; ++e)
    Dt(this, f[e], a[e], h[e], t[e]);
  return this;
}
function zn(t, n, e) {
  if (isNaN(t = +t) || isNaN(n = +n) || isNaN(e = +e)) return this;
  var i = this._x0, r = this._y0, s = this._z0, o = this._x1, f = this._y1, a = this._z1;
  if (isNaN(i))
    o = (i = Math.floor(t)) + 1, f = (r = Math.floor(n)) + 1, a = (s = Math.floor(e)) + 1;
  else {
    for (var h = o - i || 1, u = this._root, l, _; i > t || t >= o || r > n || n >= f || s > e || e >= a; )
      switch (_ = (e < s) << 2 | (n < r) << 1 | t < i, l = new Array(8), l[_] = u, u = l, h *= 2, _) {
        case 0:
          o = i + h, f = r + h, a = s + h;
          break;
        case 1:
          i = o - h, f = r + h, a = s + h;
          break;
        case 2:
          o = i + h, r = f - h, a = s + h;
          break;
        case 3:
          i = o - h, r = f - h, a = s + h;
          break;
        case 4:
          o = i + h, f = r + h, s = a - h;
          break;
        case 5:
          i = o - h, f = r + h, s = a - h;
          break;
        case 6:
          o = i + h, r = f - h, s = a - h;
          break;
        case 7:
          i = o - h, r = f - h, s = a - h;
          break;
      }
    this._root && this._root.length && (this._root = u);
  }
  return this._x0 = i, this._y0 = r, this._z0 = s, this._x1 = o, this._y1 = f, this._z1 = a, this;
}
function Mn() {
  var t = [];
  return this.visit(function(n) {
    if (!n.length) do
      t.push(n.data);
    while (n = n.next);
  }), t;
}
function Nn(t) {
  return arguments.length ? this.cover(+t[0][0], +t[0][1], +t[0][2]).cover(+t[1][0], +t[1][1], +t[1][2]) : isNaN(this._x0) ? void 0 : [[this._x0, this._y0, this._z0], [this._x1, this._y1, this._z1]];
}
function b(t, n, e, i, r, s, o) {
  this.node = t, this.x0 = n, this.y0 = e, this.z0 = i, this.x1 = r, this.y1 = s, this.z1 = o;
}
function mn(t, n, e, i) {
  var r, s = this._x0, o = this._y0, f = this._z0, a, h, u, l, _, y, M = this._x1, p = this._y1, x = this._z1, g = [], z = this._root, w, N;
  for (z && g.push(new b(z, s, o, f, M, p, x)), i == null ? i = 1 / 0 : (s = t - i, o = n - i, f = e - i, M = t + i, p = n + i, x = e + i, i *= i); w = g.pop(); )
    if (!(!(z = w.node) || (a = w.x0) > M || (h = w.y0) > p || (u = w.z0) > x || (l = w.x1) < s || (_ = w.y1) < o || (y = w.z1) < f))
      if (z.length) {
        var c = (a + l) / 2, d = (h + _) / 2, m = (u + y) / 2;
        g.push(
          new b(z[7], c, d, m, l, _, y),
          new b(z[6], a, d, m, c, _, y),
          new b(z[5], c, h, m, l, d, y),
          new b(z[4], a, h, m, c, d, y),
          new b(z[3], c, d, u, l, _, m),
          new b(z[2], a, d, u, c, _, m),
          new b(z[1], c, h, u, l, d, m),
          new b(z[0], a, h, u, c, d, m)
        ), (N = (e >= m) << 2 | (n >= d) << 1 | t >= c) && (w = g[g.length - 1], g[g.length - 1] = g[g.length - 1 - N], g[g.length - 1 - N] = w);
      } else {
        var F = t - +this._x.call(null, z.data), A = n - +this._y.call(null, z.data), q = e - +this._z.call(null, z.data), $ = F * F + A * A + q * q;
        if ($ < i) {
          var k = Math.sqrt(i = $);
          s = t - k, o = n - k, f = e - k, M = t + k, p = n + k, x = e + k, r = z.data;
        }
      }
  return r;
}
function An(t) {
  if (isNaN(_ = +this._x.call(null, t)) || isNaN(y = +this._y.call(null, t)) || isNaN(M = +this._z.call(null, t))) return this;
  var n, e = this._root, i, r, s, o = this._x0, f = this._y0, a = this._z0, h = this._x1, u = this._y1, l = this._z1, _, y, M, p, x, g, z, w, N, c, d;
  if (!e) return this;
  if (e.length) for (; ; ) {
    if ((z = _ >= (p = (o + h) / 2)) ? o = p : h = p, (w = y >= (x = (f + u) / 2)) ? f = x : u = x, (N = M >= (g = (a + l) / 2)) ? a = g : l = g, n = e, !(e = e[c = N << 2 | w << 1 | z])) return this;
    if (!e.length) break;
    (n[c + 1 & 7] || n[c + 2 & 7] || n[c + 3 & 7] || n[c + 4 & 7] || n[c + 5 & 7] || n[c + 6 & 7] || n[c + 7 & 7]) && (i = n, d = c);
  }
  for (; e.data !== t; ) if (r = e, !(e = e.next)) return this;
  return (s = e.next) && delete e.next, r ? (s ? r.next = s : delete r.next, this) : n ? (s ? n[c] = s : delete n[c], (e = n[0] || n[1] || n[2] || n[3] || n[4] || n[5] || n[6] || n[7]) && e === (n[7] || n[6] || n[5] || n[4] || n[3] || n[2] || n[1] || n[0]) && !e.length && (i ? i[d] = e : this._root = e), this) : (this._root = s, this);
}
function Fn(t) {
  for (var n = 0, e = t.length; n < e; ++n) this.remove(t[n]);
  return this;
}
function $n() {
  return this._root;
}
function bn() {
  var t = 0;
  return this.visit(function(n) {
    if (!n.length) do
      ++t;
    while (n = n.next);
  }), t;
}
function qn(t) {
  var n = [], e, i = this._root, r, s, o, f, a, h, u;
  for (i && n.push(new b(i, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1)); e = n.pop(); )
    if (!t(i = e.node, s = e.x0, o = e.y0, f = e.z0, a = e.x1, h = e.y1, u = e.z1) && i.length) {
      var l = (s + a) / 2, _ = (o + h) / 2, y = (f + u) / 2;
      (r = i[7]) && n.push(new b(r, l, _, y, a, h, u)), (r = i[6]) && n.push(new b(r, s, _, y, l, h, u)), (r = i[5]) && n.push(new b(r, l, o, y, a, _, u)), (r = i[4]) && n.push(new b(r, s, o, y, l, _, u)), (r = i[3]) && n.push(new b(r, l, _, f, a, h, y)), (r = i[2]) && n.push(new b(r, s, _, f, l, h, y)), (r = i[1]) && n.push(new b(r, l, o, f, a, _, y)), (r = i[0]) && n.push(new b(r, s, o, f, l, _, y));
    }
  return this;
}
function kn(t) {
  var n = [], e = [], i;
  for (this._root && n.push(new b(this._root, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1)); i = n.pop(); ) {
    var r = i.node;
    if (r.length) {
      var s, o = i.x0, f = i.y0, a = i.z0, h = i.x1, u = i.y1, l = i.z1, _ = (o + h) / 2, y = (f + u) / 2, M = (a + l) / 2;
      (s = r[0]) && n.push(new b(s, o, f, a, _, y, M)), (s = r[1]) && n.push(new b(s, _, f, a, h, y, M)), (s = r[2]) && n.push(new b(s, o, y, a, _, u, M)), (s = r[3]) && n.push(new b(s, _, y, a, h, u, M)), (s = r[4]) && n.push(new b(s, o, f, M, _, y, l)), (s = r[5]) && n.push(new b(s, _, f, M, h, y, l)), (s = r[6]) && n.push(new b(s, o, y, M, _, u, l)), (s = r[7]) && n.push(new b(s, _, y, M, h, u, l));
    }
    e.push(i);
  }
  for (; i = e.pop(); )
    t(i.node, i.x0, i.y0, i.z0, i.x1, i.y1, i.z1);
  return this;
}
function Dn(t) {
  return t[0];
}
function In(t) {
  return arguments.length ? (this._x = t, this) : this._x;
}
function En(t) {
  return t[1];
}
function Sn(t) {
  return arguments.length ? (this._y = t, this) : this._y;
}
function Tn(t) {
  return t[2];
}
function Cn(t) {
  return arguments.length ? (this._z = t, this) : this._z;
}
function xt(t, n, e, i) {
  var r = new yt(n ?? Dn, e ?? En, i ?? Tn, NaN, NaN, NaN, NaN, NaN, NaN);
  return t == null ? r : r.addAll(t);
}
function yt(t, n, e, i, r, s, o, f, a) {
  this._x = t, this._y = n, this._z = e, this._x0 = i, this._y0 = r, this._z0 = s, this._x1 = o, this._y1 = f, this._z1 = a, this._root = void 0;
}
function zt(t) {
  for (var n = { data: t.data }, e = n; t = t.next; ) e = e.next = { data: t.data };
  return n;
}
var I = xt.prototype = yt.prototype;
I.copy = function() {
  var t = new yt(this._x, this._y, this._z, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1), n = this._root, e, i;
  if (!n) return t;
  if (!n.length) return t._root = zt(n), t;
  for (e = [{ source: n, target: t._root = new Array(8) }]; n = e.pop(); )
    for (var r = 0; r < 8; ++r)
      (i = n.source[r]) && (i.length ? e.push({ source: i, target: n.target[r] = new Array(8) }) : n.target[r] = zt(i));
  return t;
};
I.add = wn;
I.addAll = dn;
I.cover = zn;
I.data = Mn;
I.extent = Nn;
I.find = mn;
I.remove = An;
I.removeAll = Fn;
I.root = $n;
I.size = bn;
I.visit = qn;
I.visitAfter = kn;
I.x = In;
I.y = Sn;
I.z = Cn;
function U(t) {
  return function() {
    return t;
  };
}
function C(t) {
  return (t() - 0.5) * 1e-6;
}
function ht(t) {
  return t.x + t.vx;
}
function Mt(t) {
  return t.y + t.vy;
}
function jn(t) {
  return t.z + t.vz;
}
function Pn(t) {
  var n, e, i, r, s = 1, o = 1;
  typeof t != "function" && (t = U(t == null ? 1 : +t));
  function f() {
    for (var u, l = n.length, _, y, M, p, x, g, z, w = 0; w < o; ++w)
      for (_ = (e === 1 ? gt(n, ht) : e === 2 ? _t(n, ht, Mt) : e === 3 ? xt(n, ht, Mt, jn) : null).visitAfter(a), u = 0; u < l; ++u)
        y = n[u], g = i[y.index], z = g * g, M = y.x + y.vx, e > 1 && (p = y.y + y.vy), e > 2 && (x = y.z + y.vz), _.visit(N);
    function N(c, d, m, F, A, q, $) {
      var k = [d, m, F, A, q, $], j = k[0], H = k[1], R = k[2], X = k[e], B = k[e + 1], Bt = k[e + 2], P = c.data, rt = c.r, D = g + rt;
      if (P) {
        if (P.index > y.index) {
          var Q = M - P.x - P.vx, Z = e > 1 ? p - P.y - P.vy : 0, G = e > 2 ? x - P.z - P.vz : 0, O = Q * Q + Z * Z + G * G;
          O < D * D && (Q === 0 && (Q = C(r), O += Q * Q), e > 1 && Z === 0 && (Z = C(r), O += Z * Z), e > 2 && G === 0 && (G = C(r), O += G * G), O = (D - (O = Math.sqrt(O))) / O * s, y.vx += (Q *= O) * (D = (rt *= rt) / (z + rt)), e > 1 && (y.vy += (Z *= O) * D), e > 2 && (y.vz += (G *= O) * D), P.vx -= Q * (D = 1 - D), e > 1 && (P.vy -= Z * D), e > 2 && (P.vz -= G * D));
        }
        return;
      }
      return j > M + D || X < M - D || e > 1 && (H > p + D || B < p - D) || e > 2 && (R > x + D || Bt < x - D);
    }
  }
  function a(u) {
    if (u.data) return u.r = i[u.data.index];
    for (var l = u.r = 0; l < Math.pow(2, e); ++l)
      u[l] && u[l].r > u.r && (u.r = u[l].r);
  }
  function h() {
    if (n) {
      var u, l = n.length, _;
      for (i = new Array(l), u = 0; u < l; ++u) _ = n[u], i[_.index] = +t(_, u, n);
    }
  }
  return f.initialize = function(u, ...l) {
    n = u, r = l.find((_) => typeof _ == "function") || Math.random, e = l.find((_) => [1, 2, 3].includes(_)) || 2, h();
  }, f.iterations = function(u) {
    return arguments.length ? (o = +u, f) : o;
  }, f.strength = function(u) {
    return arguments.length ? (s = +u, f) : s;
  }, f.radius = function(u) {
    return arguments.length ? (t = typeof u == "function" ? u : U(+u), h(), f) : t;
  }, f;
}
function On(t) {
  return t.index;
}
function Nt(t, n) {
  var e = t.get(n);
  if (!e) throw new Error("node not found: " + n);
  return e;
}
function Bn(t) {
  var n = On, e = M, i, r = p, s, o = U(30), f = 1, a, h, u, l, _, y = 1;
  t == null && (t = []);
  function M(c) {
    return 1 / Math.min(l[c.source.index], l[c.target.index]);
  }
  function p(c) {
    return l[c.source.index] / (l[c.source.index] + l[c.target.index]);
  }
  function x(c) {
    for (var d = 0, m = t.length; d < y; ++d)
      for (var F = 0, A, q, $, k = 0, j = 0, H = 0, R, X; F < m; ++F) {
        A = t[F], q = A.source, $ = A.target, k = $.x + $.vx - q.x - q.vx || C(_), u > 1 && (j = $.y + $.vy - q.y - q.vy || C(_)), u > 2 && (H = $.z + $.vz - q.z - q.vz || C(_)), R = Math.sqrt(k * k + j * j + H * H);
        let B = R - a[F];
        f == 2 ? B = B * Math.abs(B) : B = B = Math.sign(B) * Math.pow(Math.abs(B), f), R = B / R * c * i[F], k *= R, j *= R, H *= R, $.vx -= k * (X = s[F]), u > 1 && ($.vy -= j * X), u > 2 && ($.vz -= H * X), q.vx += k * (X = 1 - X), u > 1 && (q.vy += j * X), u > 2 && (q.vz += H * X);
      }
  }
  function g() {
    if (h) {
      var c, d = h.length, m = t.length, F = new Map(h.map((q, $) => [n(q, $, h), q])), A;
      for (c = 0, l = new Array(d); c < m; ++c)
        A = t[c], A.index = c, typeof A.source != "object" && (A.source = Nt(F, A.source)), typeof A.target != "object" && (A.target = Nt(F, A.target)), l[A.source.index] = (l[A.source.index] || 0) + 1, l[A.target.index] = (l[A.target.index] || 0) + 1;
      for (c = 0; c < m; ++c)
        A = t[c];
      i = new Array(m), z(), a = new Array(m), N(), s = new Array(m), w();
    }
  }
  function z() {
    if (h)
      for (var c = 0, d = t.length; c < d; ++c)
        i[c] = +e(t[c], c, t);
  }
  function w() {
    if (h)
      for (var c = 0, d = t.length; c < d; ++c)
        s[c] = +r(t[c], c, t);
  }
  function N() {
    if (h)
      for (var c = 0, d = t.length; c < d; ++c)
        a[c] = +o(t[c], c, t);
  }
  return x.initialize = function(c, ...d) {
    h = c, _ = d.find((m) => typeof m == "function") || Math.random, u = d.find((m) => [1, 2, 3].includes(m)) || 2, g();
  }, x.links = function(c) {
    return arguments.length ? (t = c, g(), x) : t;
  }, x.id = function(c) {
    return arguments.length ? (n = c, x) : n;
  }, x.iterations = function(c) {
    return arguments.length ? (y = +c, x) : y;
  }, x.strength = function(c) {
    return arguments.length ? (e = typeof c == "function" ? c : U(+c), z(), x) : e;
  }, x.bias = function(c) {
    return arguments.length ? (r = typeof c == "function" ? c : U(+c), w(), x) : r;
  }, x.exponent = function(c) {
    return arguments.length ? (f = +c, x) : f;
  }, x.distance = function(c) {
    return arguments.length ? (o = typeof c == "function" ? c : U(+c), N(), x) : o;
  }, x;
}
var Rn = { value: () => {
} };
function It() {
  for (var t = 0, n = arguments.length, e = {}, i; t < n; ++t) {
    if (!(i = arguments[t] + "") || i in e || /[\s.]/.test(i)) throw new Error("illegal type: " + i);
    e[i] = [];
  }
  return new st(e);
}
function st(t) {
  this._ = t;
}
function Xn(t, n) {
  return t.trim().split(/^|\s+/).map(function(e) {
    var i = "", r = e.indexOf(".");
    if (r >= 0 && (i = e.slice(r + 1), e = e.slice(0, r)), e && !n.hasOwnProperty(e)) throw new Error("unknown type: " + e);
    return { type: e, name: i };
  });
}
st.prototype = It.prototype = {
  constructor: st,
  on: function(t, n) {
    var e = this._, i = Xn(t + "", e), r, s = -1, o = i.length;
    if (arguments.length < 2) {
      for (; ++s < o; ) if ((r = (t = i[s]).type) && (r = Ln(e[r], t.name))) return r;
      return;
    }
    if (n != null && typeof n != "function") throw new Error("invalid callback: " + n);
    for (; ++s < o; )
      if (r = (t = i[s]).type) e[r] = mt(e[r], t.name, n);
      else if (n == null) for (r in e) e[r] = mt(e[r], t.name, null);
    return this;
  },
  copy: function() {
    var t = {}, n = this._;
    for (var e in n) t[e] = n[e].slice();
    return new st(t);
  },
  call: function(t, n) {
    if ((r = arguments.length - 2) > 0) for (var e = new Array(r), i = 0, r, s; i < r; ++i) e[i] = arguments[i + 2];
    if (!this._.hasOwnProperty(t)) throw new Error("unknown type: " + t);
    for (s = this._[t], i = 0, r = s.length; i < r; ++i) s[i].value.apply(n, e);
  },
  apply: function(t, n, e) {
    if (!this._.hasOwnProperty(t)) throw new Error("unknown type: " + t);
    for (var i = this._[t], r = 0, s = i.length; r < s; ++r) i[r].value.apply(n, e);
  }
};
function Ln(t, n) {
  for (var e = 0, i = t.length, r; e < i; ++e)
    if ((r = t[e]).name === n)
      return r.value;
}
function mt(t, n, e) {
  for (var i = 0, r = t.length; i < r; ++i)
    if (t[i].name === n) {
      t[i] = Rn, t = t.slice(0, i).concat(t.slice(i + 1));
      break;
    }
  return e != null && t.push({ name: n, value: e }), t;
}
var J = 0, nt = 0, K = 0, Et = 1e3, ot, et, at = 0, V = 0, ft = 0, it = typeof performance == "object" && performance.now ? performance : Date, St = typeof window == "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(t) {
  setTimeout(t, 17);
};
function Tt() {
  return V || (St(Yn), V = it.now() + ft);
}
function Yn() {
  V = 0;
}
function ut() {
  this._call = this._time = this._next = null;
}
ut.prototype = Ct.prototype = {
  constructor: ut,
  restart: function(t, n, e) {
    if (typeof t != "function") throw new TypeError("callback is not a function");
    e = (e == null ? Tt() : +e) + (n == null ? 0 : +n), !this._next && et !== this && (et ? et._next = this : ot = this, et = this), this._call = t, this._time = e, ct();
  },
  stop: function() {
    this._call && (this._call = null, this._time = 1 / 0, ct());
  }
};
function Ct(t, n, e) {
  var i = new ut();
  return i.restart(t, n, e), i;
}
function Hn() {
  Tt(), ++J;
  for (var t = ot, n; t; )
    (n = V - t._time) >= 0 && t._call.call(void 0, n), t = t._next;
  --J;
}
function At() {
  V = (at = it.now()) + ft, J = nt = 0;
  try {
    Hn();
  } finally {
    J = 0, Zn(), V = 0;
  }
}
function Qn() {
  var t = it.now(), n = t - at;
  n > Et && (ft -= n, at = t);
}
function Zn() {
  for (var t, n = ot, e, i = 1 / 0; n; )
    n._call ? (i > n._time && (i = n._time), t = n, n = n._next) : (e = n._next, n._next = null, n = t ? t._next = e : ot = e);
  et = t, ct(i);
}
function ct(t) {
  if (!J) {
    nt && (nt = clearTimeout(nt));
    var n = t - V;
    n > 24 ? (t < 1 / 0 && (nt = setTimeout(At, t - it.now() - ft)), K && (K = clearInterval(K))) : (K || (at = it.now(), K = setInterval(Qn, Et)), J = 1, St(At));
  }
}
const Gn = 1664525, Un = 1013904223, Ft = 4294967296;
function Vn() {
  let t = 1;
  return () => (t = (Gn * t + Un) % Ft) / Ft;
}
var $t = 3;
function lt(t) {
  return t.x;
}
function bt(t) {
  return t.y;
}
function Jn(t) {
  return t.z;
}
var Kn = 10, Wn = Math.PI * (3 - Math.sqrt(5)), te = Math.PI * 20 / (9 + Math.sqrt(221));
function ne(t, n) {
  n = n || 2;
  var e = Math.min($t, Math.max(1, Math.round(n))), i, r = 1, s = 1e-3, o = 1 - Math.pow(s, 1 / 300), f = 0, a = 0.6, h = /* @__PURE__ */ new Map(), u = Ct(y), l = It("tick", "end"), _ = Vn();
  t == null && (t = []);
  function y() {
    M(), l.call("tick", i), r < s && (u.stop(), l.call("end", i));
  }
  function M(g) {
    var z, w = t.length, N;
    g === void 0 && (g = 1);
    for (var c = 0; c < g; ++c)
      for (r += (f - r) * o, h.forEach(function(d) {
        d(r);
      }), z = 0; z < w; ++z)
        N = t[z], N.fx == null ? N.x += N.vx *= a : (N.x = N.fx, N.vx = 0), e > 1 && (N.fy == null ? N.y += N.vy *= a : (N.y = N.fy, N.vy = 0)), e > 2 && (N.fz == null ? N.z += N.vz *= a : (N.z = N.fz, N.vz = 0));
    return i;
  }
  function p() {
    for (var g = 0, z = t.length, w; g < z; ++g) {
      if (w = t[g], w.index = g, w.fx != null && (w.x = w.fx), w.fy != null && (w.y = w.fy), w.fz != null && (w.z = w.fz), isNaN(w.x) || e > 1 && isNaN(w.y) || e > 2 && isNaN(w.z)) {
        var N = Kn * (e > 2 ? Math.cbrt(0.5 + g) : e > 1 ? Math.sqrt(0.5 + g) : g), c = g * Wn, d = g * te;
        e === 1 ? w.x = N : e === 2 ? (w.x = N * Math.cos(c), w.y = N * Math.sin(c)) : (w.x = N * Math.sin(c) * Math.cos(d), w.y = N * Math.cos(c), w.z = N * Math.sin(c) * Math.sin(d));
      }
      (isNaN(w.vx) || e > 1 && isNaN(w.vy) || e > 2 && isNaN(w.vz)) && (w.vx = 0, e > 1 && (w.vy = 0), e > 2 && (w.vz = 0));
    }
  }
  function x(g) {
    return g.initialize && g.initialize(t, _, e), g;
  }
  return p(), i = {
    tick: M,
    restart: function() {
      return u.restart(y), i;
    },
    stop: function() {
      return u.stop(), i;
    },
    numDimensions: function(g) {
      return arguments.length ? (e = Math.min($t, Math.max(1, Math.round(g))), h.forEach(x), i) : e;
    },
    nodes: function(g) {
      return arguments.length ? (t = g, p(), h.forEach(x), i) : t;
    },
    alpha: function(g) {
      return arguments.length ? (r = +g, i) : r;
    },
    alphaMin: function(g) {
      return arguments.length ? (s = +g, i) : s;
    },
    alphaDecay: function(g) {
      return arguments.length ? (o = +g, i) : +o;
    },
    alphaTarget: function(g) {
      return arguments.length ? (f = +g, i) : f;
    },
    velocityDecay: function(g) {
      return arguments.length ? (a = 1 - g, i) : 1 - a;
    },
    randomSource: function(g) {
      return arguments.length ? (_ = g, h.forEach(x), i) : _;
    },
    force: function(g, z) {
      return arguments.length > 1 ? (z == null ? h.delete(g) : h.set(g, x(z)), i) : h.get(g);
    },
    find: function() {
      var g = Array.prototype.slice.call(arguments), z = g.shift() || 0, w = (e > 1 ? g.shift() : null) || 0, N = (e > 2 ? g.shift() : null) || 0, c = g.shift() || 1 / 0, d = 0, m = t.length, F, A, q, $, k, j;
      for (c *= c, d = 0; d < m; ++d)
        k = t[d], F = z - k.x, A = w - (k.y || 0), q = N - (k.z || 0), $ = F * F + A * A + q * q, $ < c && (j = k, c = $);
      return j;
    },
    on: function(g, z) {
      return arguments.length > 1 ? (l.on(g, z), i) : l.on(g);
    }
  };
}
function ee() {
  var t, n, e, i, r, s = U(-30), o = 1, f, a = 1, h = 1 / 0, u = 0.81;
  function l(p) {
    var x, g = t.length, z = (n === 1 ? gt(t, lt) : n === 2 ? _t(t, lt, bt) : n === 3 ? xt(t, lt, bt, Jn) : null).visitAfter(y);
    for (r = p, x = 0; x < g; ++x) e = t[x], z.visit(M);
  }
  function _() {
    if (t) {
      var p, x = t.length, g;
      for (f = new Array(x), p = 0; p < x; ++p) g = t[p], f[g.index] = +s(g, p, t);
    }
  }
  function y(p) {
    var x = 0, g, z, w = 0, N, c, d, m, F = p.length;
    if (F) {
      for (N = c = d = m = 0; m < F; ++m)
        (g = p[m]) && (z = Math.abs(g.value)) && (x += g.value, w += z, N += z * (g.x || 0), c += z * (g.y || 0), d += z * (g.z || 0));
      x *= Math.sqrt(4 / F), p.x = N / w, n > 1 && (p.y = c / w), n > 2 && (p.z = d / w);
    } else {
      g = p, g.x = g.data.x, n > 1 && (g.y = g.data.y), n > 2 && (g.z = g.data.z);
      do
        x += f[g.data.index];
      while (g = g.next);
    }
    p.value = x;
  }
  function M(p, x, g, z, w) {
    if (!p.value) return !0;
    var N = [g, z, w][n - 1], c = p.x - e.x, d = n > 1 ? p.y - e.y : 0, m = n > 2 ? p.z - e.z : 0, F = N - x, A = c * c + d * d + m * m;
    if (F * F / u < A) {
      if (A < h) {
        c === 0 && (c = C(i), A += c * c), n > 1 && d === 0 && (d = C(i), A += d * d), n > 2 && m === 0 && (m = C(i), A += m * m), A < a && (A = Math.sqrt(a * A));
        let $ = A;
        o == 1 || (o == 2 ? $ = A * Math.sqrt(A) : $ = Math.pow(A, (o + 1) / 2)), e.vx += c * p.value * r / $, n > 1 && (e.vy += d * p.value * r / $), n > 2 && (e.vz += m * p.value * r / $);
      }
      return !0;
    } else if (p.length || A >= h) return;
    (p.data !== e || p.next) && (c === 0 && (c = C(i), A += c * c), n > 1 && d === 0 && (d = C(i), A += d * d), n > 2 && m === 0 && (m = C(i), A += m * m), A < a && (A = Math.sqrt(a * A)));
    let q = A;
    o == 1 || (o == 2 ? q = A * Math.sqrt(A) : q = Math.pow(A, (o + 1) / 2));
    do
      p.data !== e && (F = f[p.data.index] * r / q, e.vx += c * F, n > 1 && (e.vy += d * F), n > 2 && (e.vz += m * F));
    while (p = p.next);
  }
  return l.initialize = function(p, ...x) {
    t = p, i = x.find((g) => typeof g == "function") || Math.random, n = x.find((g) => [1, 2, 3].includes(g)) || 2, _();
  }, l.strength = function(p) {
    return arguments.length ? (s = typeof p == "function" ? p : U(+p), _(), l) : s;
  }, l.exponent = function(p) {
    return arguments.length ? (o = +p, l) : o;
  }, l.distanceMin = function(p) {
    return arguments.length ? (a = p * p, l) : Math.sqrt(a);
  }, l.distanceMax = function(p) {
    return arguments.length ? (h = p * p, l) : Math.sqrt(h);
  }, l.theta = function(p) {
    return arguments.length ? (u = p * p, l) : Math.sqrt(u);
  }, l;
}
const Y = 10, jt = {
  use2D: !1,
  forcesStrength: 1,
  forcesRatio: 1,
  repulsiveExponent: 1,
  attractiveExponent: 1,
  gravity: 0.05,
  viscosity: 0.05,
  collisionEnabled: !1,
  collisionRadius: 50,
  linkDistance: 30,
  forceNormalizationType: "degree",
  alpha: 1,
  alphaDecay: 3e-3,
  alphaTarget: 0,
  alphaMin: 1e-3,
  recenter: !0,
  center: [0, 0, 0]
}, v = {
  settings: { ...jt },
  nodes: [],
  links: [],
  weighted: !1,
  simulation: null,
  repulsiveForce: null,
  attractiveForce: null,
  centralForce: null,
  gravityForce: null,
  collisionForce: null,
  lastEdgeCount: 0,
  tickCount: 0
};
function ie() {
  const t = Array.isArray(v.settings.center) ? v.settings.center : [0, 0, 0];
  return [
    Number.isFinite(t[0]) ? t[0] : 0,
    Number.isFinite(t[1]) ? t[1] : 0,
    Number.isFinite(t[2]) ? t[2] : 0
  ];
}
function Pt(t) {
  const n = v.settings.use2D;
  for (let e = 0; e < v.nodes.length; e += 1) {
    const i = v.nodes[e], r = e * 3;
    t[r] = i.x / Y, t[r + 1] = i.y / Y, t[r + 2] = n ? 0 : i.z / Y;
  }
}
function re() {
  let t = [], n = 0.05, e = 0.025;
  function i(r) {
    const s = Math.sqrt(t.length) * r * n;
    for (let o = 0, f = t.length; o < f; o += 1) {
      const a = t[o], h = a.x * a.x + a.y * a.y + a.z * a.z + e, u = Math.sqrt(h), l = s / u;
      a.vx -= a.x * l, a.vy -= a.y * l, a.vz -= a.z * l;
    }
  }
  return i.initialize = function(s) {
    t = s;
  }, i.strength = function(s) {
    return arguments.length ? (n = +s, i) : n;
  }, i.softening = function(s) {
    return arguments.length ? (e = +s, i) : e;
  }, i;
}
function W() {
  v.simulation || (v.repulsiveForce = ee(), v.attractiveForce = Bn(v.links), v.centralForce = Rt(), v.gravityForce = re(), v.collisionForce = Pn(), v.simulation = ne(v.nodes).numDimensions(v.settings.use2D ? 2 : 3).force("repulsive", v.repulsiveForce).force("attractive", v.attractiveForce).force("central", v.centralForce).force("gravity", v.gravityForce), v.simulation.stop());
}
function tt() {
  if (!v.simulation) return;
  v.simulation.numDimensions(v.settings.use2D ? 2 : 3), v.simulation.velocityDecay(v.settings.viscosity), v.simulation.alpha(v.settings.alpha), v.simulation.alphaDecay(v.settings.alphaDecay), v.simulation.alphaTarget(v.settings.alphaTarget), v.simulation.alphaMin(v.settings.alphaMin);
  const [t, n, e] = ie();
  v.centralForce?.x?.(t), v.centralForce?.y?.(n), v.centralForce?.z?.(e), v.gravityForce?.strength(v.settings.gravity), v.collisionForce?.radius(v.settings.collisionRadius), v.settings.recenter !== !1 ? v.simulation.force("central") || v.simulation.force("central", v.centralForce) : v.simulation.force("central") && v.simulation.force("central", null), v.settings.collisionEnabled ? v.simulation.force("collision") || v.simulation.force("collision", v.collisionForce) : v.simulation.force("collision") && v.simulation.force("collision", null), Ot();
}
function se(t) {
  const n = Math.floor(t.length / 3);
  v.nodes = new Array(n);
  for (let e = 0; e < n; e += 1) {
    const i = e * 3, r = {
      x: t[i] * Y,
      y: t[i + 1] * Y,
      z: t[i + 2] * Y,
      vx: 0,
      vy: 0,
      vz: 0,
      ID: e,
      strength: 1,
      degree: 0
    };
    v.nodes[e] = r;
  }
  v.simulation && v.simulation.nodes(v.nodes);
}
function oe(t, { resetVelocity: n = !1 } = {}) {
  const e = Math.min(v.nodes.length, Math.floor(t.length / 3));
  for (let i = 0; i < e; i += 1) {
    const r = i * 3, s = v.nodes[i];
    s.x = t[r] * Y, s.y = t[r + 1] * Y, s.z = t[r + 2] * Y, n && (s.vx = 0, s.vy = 0, s.vz = 0);
  }
}
function ae(t, n) {
  const e = Math.floor(t.length / 2);
  v.links = new Array(e);
  for (let i = 0; i < e; i += 1) {
    const r = v.nodes[t[i * 2]], s = v.nodes[t[i * 2 + 1]], o = { source: r, target: s };
    n && n.length === e && (o.weight = n[i]), v.links[i] = o;
  }
  v.weighted = !!(n && n.length === e), v.attractiveForce && v.attractiveForce.links(v.links), v.lastEdgeCount = t.length, fe(), Ot();
}
function fe() {
  for (let t = 0; t < v.nodes.length; t += 1) {
    const n = v.nodes[t];
    n.strength = 0, n.degree = 0;
  }
  if (v.links.length !== 0)
    for (let t = 0; t < v.links.length; t += 1) {
      const n = v.links[t], e = v.weighted ? n.weight : 1;
      n.source.strength += e, n.target.strength += e, n.source.degree += 1, n.target.degree += 1;
    }
}
function Ot() {
  const t = v.settings.forcesStrength, n = Math.max(1e-6, Number(v.settings.forcesRatio) || jt.forcesRatio), e = v.settings.repulsiveExponent, i = v.settings.attractiveExponent, r = t * Math.pow(1 / n, e / 2), s = t * Math.pow(n, i / 2);
  !v.repulsiveForce || !v.attractiveForce || (v.weighted ? v.settings.forceNormalizationType === "strength" ? v.attractiveForce.strength((o) => {
    if (!o.weight) return 0;
    const f = Math.max(1, Math.min(o.target.strength, o.source.strength));
    return s * o.weight / f;
  }) : v.settings.forceNormalizationType === "degree" ? v.attractiveForce.strength((o) => {
    if (!o.weight) return 0;
    const f = Math.max(1, Math.min(o.target.degree, o.source.degree));
    return s * o.weight / f;
  }) : v.attractiveForce.strength((o) => s * (o.weight ?? 1)) : v.settings.forceNormalizationType === "strength" ? v.attractiveForce.strength((o) => {
    const f = Math.max(1, Math.min(o.target.strength, o.source.strength));
    return s / f;
  }) : v.settings.forceNormalizationType === "degree" ? v.attractiveForce.strength((o) => {
    const f = Math.max(1, Math.min(o.target.degree, o.source.degree));
    return s / f;
  }) : v.attractiveForce.strength(s), v.repulsiveForce.exponent(v.settings.repulsiveExponent), v.attractiveForce.exponent(v.settings.attractiveExponent), v.repulsiveForce.strength(-r), v.attractiveForce.distance(v.settings.linkDistance));
}
function he(t) {
  v.simulation && (v.simulation.tick(), Pt(t), v.settings.alpha = v.simulation.alpha(), v.tickCount += 1);
}
self.onmessage = (t) => {
  const n = t.data;
  if (n) {
    if (n.type === "init") {
      n.options?.settings && (v.settings = { ...v.settings, ...n.options.settings }), W(), tt(), self.postMessage({ type: "ready" });
      return;
    }
    if (n.type === "options") {
      n.settings && (v.settings = { ...v.settings, ...n.settings }), W(), tt();
      return;
    }
    if (n.type === "tick" && n.positions instanceof Float32Array) {
      let e = !1;
      n.options?.settings && (v.settings = { ...v.settings, ...n.options.settings }, e = !0);
      const i = Math.floor(n.positions.length / 3);
      if ((!v.nodes.length || v.nodes.length !== i) && (se(n.positions), W(), tt(), e = !1), n.edges instanceof Uint32Array) {
        const r = n.edges.length !== v.lastEdgeCount;
        (!v.links.length || r) && ae(n.edges, n.weights);
      }
      if (e && (W(), tt()), n.adoptOnly === !0) {
        W(), oe(n.positions, { resetVelocity: !0 }), v.simulation.nodes(v.nodes), tt(), Pt(n.positions), self.postMessage({ type: "positions", positions: n.positions, alpha: v.settings.alpha }, [n.positions.buffer]);
        return;
      }
      he(n.positions), self.postMessage({ type: "positions", positions: n.positions, alpha: v.settings.alpha }, [n.positions.buffer]);
    }
  }
};
//# sourceMappingURL=d3force3dWorker-B1X76C7R.js.map
