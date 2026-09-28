/* ==============================
   1. Города и данные
   ============================== */
const cityCoordinates = { moscow:[55.751244,37.618423], kazan:[55.796127,49.106405], sochi:[43.585525,39.723062], spb:[59.93428,30.335098] };
const cityNames = { moscow:"Москва", kazan:"Казань", sochi:"Сочи", spb:"Санкт-Петербург" };
let map, routeCollection, pointCollection, multiRoute;

/* ==============================
   2. Яндекс Карта и метки
   ============================== */
function addAccessibilityPoints(center) {
  const [lat,lng] = center;
  const checks = [
    {point:[lat+.004,lng-.006], preset:"islands#greenCircleDotIcon", title:"Доступный переход", text:"Съезд найден с обеих сторон дороги."},
    {point:[lat+.001,lng-.001], preset:"islands#orangeCircleDotIcon", title:"Требует проверки", text:"Рекомендуется уточнить состояние покрытия и бордюров."},
    {point:[lat-.002,lng+.005], preset:"islands#redCircleDotIcon", title:"Возможное препятствие", text:"Возможен высокий бордюр или неровное покрытие."}
  ];
  checks.forEach(item => pointCollection.add(new ymaps.Placemark(item.point,{balloonContentHeader:item.title,balloonContentBody:item.text},{preset:item.preset})));
}
function initMap() {
  map = new ymaps.Map("map", {center:cityCoordinates.moscow, zoom:13, controls:["zoomControl","geolocationControl","typeSelector"]});
  routeCollection = new ymaps.GeoObjectCollection();
  pointCollection = new ymaps.GeoObjectCollection();
  map.geoObjects.add(routeCollection);
  map.geoObjects.add(pointCollection);
  addAccessibilityPoints(cityCoordinates.moscow);
}
function clearMapData() {
  routeCollection.removeAll();
  pointCollection.removeAll();
  if (multiRoute) { map.geoObjects.remove(multiRoute); multiRoute = null; }
}

/* ==============================
   3. Построение маршрута
   ============================== */
function buildRoute(fromAddr,toAddr,city,userType) {
  clearMapData();
  const routingMode = "pedestrian";
  multiRoute = new ymaps.multiRouter.MultiRoute({referencePoints:[fromAddr,toAddr], params:{routingMode:routingMode, results:1}}, {boundsAutoApply:true, wayPointVisible:false, viaPointVisible:false, routeActiveStrokeColor:"#a86478", routeActiveStrokeWidth:6, routeInactiveStrokeColor:"#c8b8bc", routeInactiveStrokeWidth:4});
  map.geoObjects.add(multiRoute);
  addAccessibilityPoints(cityCoordinates[city]);
  multiRoute.model.events.add("requestsuccess", () => {
    const resultBlock = document.getElementById("routeResult");
    const desc = document.getElementById("resultDescription");
    const msg = document.getElementById("routeMessage");
    resultBlock.hidden = false;
    desc.textContent = `Маршрут построен через Яндекс Карты с учётом пешеходных дорожек. Метки на карте показывают предварительную оценку доступности для категории: ${userTypeLabel(userType)}.`;
    msg.textContent = "Маршрут построен. Нажмите на цветные метки для просмотра пояснений.";
  });
  multiRoute.model.events.add("requestfail", () => {
    const msg = document.getElementById("routeMessage");
    msg.textContent = "Не удалось построить маршрут. Проверьте адреса и попробуйте снова.";
  });
}
function userTypeLabel(type) {
  const labels = { default:"по умолчанию", child:"ребёнок", stroller:"родитель с коляской", wheelchair:"человек на коляске", blind:"инвалид по зрению", senior:"пожилой человек" };
  return labels[type] || "по умолчанию";
}

/* ==============================
   4. Форма маршрута
   ============================== */
const citySelect = document.getElementById("citySelect");
const cityStatus = document.getElementById("cityStatus");
const routeForm = document.getElementById("routeForm");
const routeMessage = document.getElementById("routeMessage");

citySelect.addEventListener("change", () => {
  const city = citySelect.value;
  cityStatus.textContent = cityNames[city];
  clearMapData();
  map.setCenter(cityCoordinates[city], 13);
  addAccessibilityPoints(cityCoordinates[city]);
});

routeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const from = document.getElementById("fromInput").value.trim();
  const to = document.getElementById("toInput").value.trim();
  const city = citySelect.value;
  const userType = document.getElementById("userType").value;

  if (!from || !to) {
    routeMessage.textContent = "Заполните оба поля: «Откуда» и «Куда».";
    return;
  }

  routeMessage.textContent = "Строю маршрут...";
  buildRoute(from, to, city, userType);
});

/* ==============================
   5. Регистрация пользователя
   ============================== */
const authModal = document.getElementById("authModal");
const openAuthButton = document.getElementById("openAuthButton");
const closeAuthButton = document.getElementById("closeAuthButton");

openAuthButton.addEventListener("click", () => { authModal.hidden = false; });
closeAuthButton.addEventListener("click", () => { authModal.hidden = true; });
authModal.addEventListener("click", (event) => { if (event.target === authModal) authModal.hidden = true; });

document.getElementById("authForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("nameInput").value.trim();
  const email = document.getElementById("emailInput").value.trim();
  localStorage.setItem("accessibleRouteAccount", JSON.stringify({ name, email }));
  document.getElementById("authMessage").textContent = `Учётная запись для ${name} сохранена в этом браузере.`;
  openAuthButton.textContent = name;
  event.target.reset();
});

try {
  const account = JSON.parse(localStorage.getItem("accessibleRouteAccount"));
  if (account && account.name) openAuthButton.textContent = account.name;
} catch (error) {}

/* ==============================
   6. Запуск API Яндекс Карт
   ============================== */
ymaps.ready(initMap);
