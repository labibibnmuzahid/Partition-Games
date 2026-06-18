/* ============================================================
   Partners — real interactive world map (Leaflet + OpenStreetMap
   dark tiles via CARTO). Three equal partner institutions; scroll
   to zoom, zoom in to reveal the people pinned at each location,
   click a person to read what they do.
   Edit PARTNERS below to add/adjust institutions or people.
   ============================================================ */
(function () {
    "use strict";

    var PARTNERS = [
        {
            id: "rhodes", name: "Rhodes College", short: "Rhodes College",
            city: "Memphis, Tennessee", country: "United States",
            lat: 35.1175, lng: -89.9711, accent: "orange",
            members: [
                { name: "Prof. Eric Gottlieb", role: "Faculty · Research lead", initials: "EG",
                  bio: "Leads the combinatorial game theory research behind GRASP and supervises the partition games and the impartial-chess (iChess) work." },
                { name: "Labib Muzahid", role: "Developer · Summer ’26", initials: "LM",
                  bio: "Developer working with Prof. Gottlieb — building the GRASP site: the 3D redesign, the iChess games on arbitrary partitions, and the interactive map/systems." },
                { name: "Rubaiya Islam", role: "Developer · Summer ’26", initials: "RI",
                  bio: "Summer ’26 fellow contributing to the GRASP game suite." },
                { name: "Sahaf Mahmud", role: "Developer · Summer ’26", initials: "SM",
                  bio: "Summer ’26 fellow contributing to the GRASP game suite." }
            ]
        },
        {
            id: "rutgers", name: "Rutgers University", short: "Rutgers",
            city: "Piscataway, New Jersey", country: "United States",
            lat: 40.5204, lng: -74.4645, accent: "cyan",
            members: [
                { name: "Collaborating faculty", role: "Faculty", initials: "R",
                  bio: "Collaborating faculty at Rutgers University — names and details to be added." }
            ]
        },
        {
            id: "up", name: "University of Primorska · FAMNIT", short: "UP · FAMNIT",
            city: "Koper / Capodistria", country: "Slovenia",
            lat: 45.5483, lng: 13.7294, accent: "orange",
            members: [
                { name: "Prof. Matjaž Krnc", role: "Faculty", initials: "MK",
                  bio: "Faculty partner at UP FAMNIT, University of Primorska." },
                { name: "Prof. Peter Mursic", role: "Faculty", initials: "PM",
                  bio: "Faculty partner at UP FAMNIT, University of Primorska." }
            ]
        }
    ];

    var REVEAL_ZOOM = 7;   // members appear at/after this zoom level

    function build() {
        var root = document.getElementById("partners-root");
        if (!root) return;
        root.innerHTML =
            '<div class="pt-hero">' +
              '<p class="pt-eyebrow">a three-way partnership</p><h1>Partners</h1>' +
              '<p>GRASP is built together by <strong>Rhodes College</strong>, <strong>Rutgers University</strong>, and the ' +
              '<strong>University of Primorska (FAMNIT)</strong> — three equal partners across two continents. ' +
              'Scroll to zoom into a campus and meet the people behind the project.</p>' +
            '</div>' +
            '<div class="pt-map">' +
              '<div id="pt-leaflet"></div>' +
              '<div class="pt-hint">⊕ scroll to zoom · click a campus to fly in</div>' +
              '<button class="pt-reset" id="pt-reset">⤢ world view</button>' +
              '<div class="pt-detail" id="pt-detail"></div>' +
            '</div>' +
            '<div class="pt-strip" id="pt-strip"></div>';

        var detail = document.getElementById("pt-detail");
        var strip = document.getElementById("pt-strip");

        if (!window.L) {   // Leaflet failed to load — graceful fallback
            document.getElementById("pt-leaflet").innerHTML =
                '<div style="display:grid;place-items:center;height:100%;color:#8aa0c0;font-family:var(--s-mono);font-size:13px;text-align:center;padding:24px">' +
                'Map library unavailable offline — see the partner list below.</div>';
        } else {
            var map = L.map("pt-leaflet", { scrollWheelZoom: true, worldCopyJump: true, minZoom: 2, zoomControl: true });
            L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: "abcd", maxZoom: 19
            }).addTo(map);

            var bounds = L.latLngBounds(PARTNERS.map(function (p) { return [p.lat, p.lng]; }));
            function worldView() { map.fitBounds(bounds, { padding: [70, 70] }); }
            worldView();

            var memberLayer = L.layerGroup();
            PARTNERS.forEach(function (p) {
                var inst = L.divIcon({
                    className: "pt-divicon " + p.accent, iconSize: [16, 16], iconAnchor: [8, 8],
                    html: '<span class="pt-mk-pin"></span><span class="pt-mk-label"><b>' + p.short + '</b> · <i>' +
                          p.members.length + (p.members.length === 1 ? " member" : " members") + '</i></span>'
                });
                L.marker([p.lat, p.lng], { icon: inst, title: p.name }).addTo(map)
                    .on("click", function () { map.flyTo([p.lat, p.lng], 13, { duration: 1.2 }); });

                p.members.forEach(function (mem, i) {
                    var ang = (i / p.members.length) * Math.PI * 2, rad = 0.012;
                    var ll = [p.lat + Math.sin(ang) * rad, p.lng + Math.cos(ang) * rad * 1.4];
                    var ic = L.divIcon({
                        className: "pt-memicon " + p.accent, iconSize: [0, 0],
                        html: '<div class="pt-mem"><span class="blk">' + mem.initials + '</span>' +
                              '<span class="nm">' + mem.name.replace(/^Prof\.\s*/, "") + '</span></div>'
                    });
                    L.marker(ll, { icon: ic }).addTo(memberLayer)
                        .on("click", function () { openMember(p, mem); });
                });
            });

            function refreshMembers() {
                if (map.getZoom() >= REVEAL_ZOOM) { if (!map.hasLayer(memberLayer)) memberLayer.addTo(map); }
                else if (map.hasLayer(memberLayer)) map.removeLayer(memberLayer);
            }
            map.on("zoomend", refreshMembers); refreshMembers();
            setTimeout(function () { map.invalidateSize(); worldView(); }, 250);

            document.getElementById("pt-reset").addEventListener("click", function () { detail.classList.remove("open"); worldView(); });
            window.__ptFly = function (p) { map.flyTo([p.lat, p.lng], 13, { duration: 1.2 }); };
        }

        function openMember(p, mem) {
            detail.className = "pt-detail open";
            detail.innerHTML =
                '<button class="pt-back" id="pt-back">← back to map</button>' +
                '<div class="pt-card-big ' + p.accent + '">' +
                  '<div class="blk">' + mem.initials + '</div>' +
                  '<div class="nm">' + mem.name + '</div>' +
                  '<div class="rl">' + mem.role + '</div>' +
                  '<div class="inst">' + p.name + ' · ' + p.city + ', ' + p.country + '</div>' +
                  '<p class="bio">' + mem.bio + '</p>' +
                '</div>';
            document.getElementById("pt-back").addEventListener("click", function () { detail.classList.remove("open"); });
        }

        PARTNERS.forEach(function (p) {
            var card = document.createElement("div");
            card.className = "pt-card";
            card.innerHTML = '<div class="nm">' + p.name + '</div>' +
                '<div class="lc">' + p.city + ' · ' + p.country + '</div>' +
                '<div class="ct">' + p.members.length + (p.members.length === 1 ? " member" : " members") + '</div>';
            card.addEventListener("click", function () { if (window.__ptFly) window.__ptFly(p); });
            strip.appendChild(card);
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
    else build();
})();
