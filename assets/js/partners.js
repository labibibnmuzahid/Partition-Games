/* ============================================================
   Partners — three equal partner institutions on an interactive
   map. Click a node (or a card) to zoom in and reveal its people.
   Edit PARTNERS below to add/adjust institutions or people.
   ============================================================ */
(function () {
    "use strict";

    /* pos = approximate place on the stylized Atlantic map (x%, y%) */
    var PARTNERS = [
        {
            id: "rhodes", name: "Rhodes College", city: "Memphis, Tennessee", country: "United States",
            coord: "35.1501° N / 90.0167° W", accent: "orange", pos: { x: 22, y: 52 },
            people: [
                { role: "Faculty", name: "Prof. Eric Gottlieb", initials: "EG" },
                { role: "Developer", name: "Labib Muzahid", initials: "LM" },
                { role: "Developer", name: "Rubaiya Islam", initials: "RI" },
                { role: "Developer", name: "Sahaf Mahmud", initials: "SM" }
            ]
        },
        {
            id: "rutgers", name: "Rutgers University", city: "Piscataway, New Jersey", country: "United States",
            coord: "40.5204° N / 74.4645° W", accent: "cyan", pos: { x: 34, y: 40 },
            people: [
                { role: "Faculty", name: "Collaborating faculty", initials: "R" }
            ]
        },
        {
            id: "up", name: "University of Primorska · FAMNIT", city: "Koper / Capodistria", country: "Slovenia",
            coord: "45.5483° N / 13.7294° E", accent: "orange", pos: { x: 64, y: 36 },
            people: [
                { role: "Faculty", name: "Prof. Matjaž Krnc", initials: "MK" },
                { role: "Faculty", name: "Prof. Peter Mursic", initials: "PM" }
            ]
        }
    ];

    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

    function build() {
        var root = document.getElementById("partners-root");
        if (!root) return;
        root.innerHTML =
            '<div class="pt-hero">' +
              '<p class="pt-eyebrow">a three-way partnership</p>' +
              '<h1>Partners</h1>' +
              '<p>GRASP is built together by <strong>Rhodes College</strong>, <strong>Rutgers University</strong>, and the ' +
              '<strong>University of Primorska (FAMNIT)</strong> — three equal partners across two continents. ' +
              'Select an institution to zoom in and meet the people behind the project.</p>' +
            '</div>' +
            '<div class="pt-map" id="pt-map">' +
              '<div class="pt-grid"></div>' +
              '<svg class="pt-net" viewBox="0 0 100 100" preserveAspectRatio="none" id="pt-net"></svg>' +
              '<div class="pt-hint">▣ select a partner to zoom in</div>' +
              '<div class="pt-compass">N<br><b>◆</b></div>' +
              '<div class="pt-detail" id="pt-detail"></div>' +
            '</div>' +
            '<div class="pt-strip" id="pt-strip"></div>';

        var map = document.getElementById("pt-map");
        var net = document.getElementById("pt-net");
        var detail = document.getElementById("pt-detail");
        var strip = document.getElementById("pt-strip");

        // connecting arcs between partners (the "network")
        var arcs = "";
        for (var i = 0; i < PARTNERS.length; i++) {
            for (var j = i + 1; j < PARTNERS.length; j++) {
                var a = PARTNERS[i].pos, b = PARTNERS[j].pos;
                var mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 12;
                arcs += '<path d="M ' + a.x + ' ' + a.y + ' Q ' + mx + ' ' + my + ' ' + b.x + ' ' + b.y + '" ' +
                        'fill="none" stroke="rgba(120,170,230,0.35)" stroke-width="0.4" stroke-dasharray="1.2 1.2"/>';
            }
        }
        net.innerHTML = arcs;

        // nodes
        PARTNERS.forEach(function (p) {
            var node = el("button", "pt-node" + (p.accent === "orange" ? " orange" : ""));
            node.style.left = p.pos.x + "%"; node.style.top = p.pos.y + "%";
            node.innerHTML = '<span class="pt-pin"></span>' +
                '<span class="pt-label"><b>' + p.name.split(" · ")[0] + '</b> · <span class="pt-count">' + p.people.length + ' ' + (p.people.length === 1 ? "member" : "members") + '</span></span>';
            node.addEventListener("click", function () { openDetail(p); });
            map.insertBefore(node, detail);
        });

        // strip cards (also open detail; double as an accessible list)
        PARTNERS.forEach(function (p) {
            var card = el("div", "pt-card",
                '<div class="nm">' + p.name + '</div>' +
                '<div class="lc">' + p.city + ' · ' + p.country + '</div>' +
                '<div class="ct">' + p.people.length + ' ' + (p.people.length === 1 ? "member" : "members") + ' · ' + p.coord + '</div>');
            card.addEventListener("click", function () { openDetail(p); });
            strip.appendChild(card);
        });

        function openDetail(p) {
            detail.className = "pt-detail open" + (p.accent === "orange" ? " orange" : "");
            var people = p.people.map(function (person, i) {
                return '<div class="pt-person" style="animation-delay:' + (i * 70) + 'ms">' +
                    '<div class="blk">' + (person.initials || "•") + '</div>' +
                    '<div class="who"><div class="nm">' + person.name + '</div><div class="rl">' + person.role + '</div></div>' +
                  '</div>';
            }).join("");
            detail.innerHTML =
                '<button class="pt-back" id="pt-back">← back to map</button>' +
                '<div class="pt-detail-head"><div class="pt-inst">' + p.name + '</div>' +
                  '<div class="pt-loc">' + p.city + ' · ' + p.country + ' · ' + p.coord + '</div></div>' +
                '<div class="pt-people">' + people + '</div>';
            document.getElementById("pt-back").addEventListener("click", function () {
                detail.classList.remove("open");
            });
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
    else build();
})();
