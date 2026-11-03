import "@johnmorrisdotca/uchusen-rockets/element";

const rocket = document.createElement("uchusen-rocket");
rocket.setAttribute("rocket", "falcon-heavy");
rocket.setAttribute("look", "thick");
rocket.style.maxWidth = "360px";
document.body.append(rocket);
