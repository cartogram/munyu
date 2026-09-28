import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const scenes = gsap.utils.toArray('main section[data-scene]');

scenes.forEach((scene) => {
	gsap.to(scene, {
		opacity: 1,
		y: 0,
		duration: 0.6,
		ease: 'power2.out',
		scrollTrigger: {
			trigger: scene,
			start: 'top 75%',
			toggleActions: 'play none none reverse',
		},
	});
});

const notesToggle = document.getElementById('notes-toggle');
const notesDrawer = document.getElementById('notes-drawer');
const notesDrawerContent = document.getElementById('notes-drawer-content');

let currentSceneNotes = null;

function renderDrawer() {
	notesDrawerContent.textContent = currentSceneNotes || 'No notes for this section.';
}

scenes.forEach((scene) => {
	const notesEl = scene.querySelector('aside.notes');
	ScrollTrigger.create({
		trigger: scene,
		start: 'top center',
		end: 'bottom center',
		onEnter: () => {
			currentSceneNotes = notesEl ? notesEl.textContent.trim() : null;
			if (notesDrawer.classList.contains('is-open')) renderDrawer();
		},
		onEnterBack: () => {
			currentSceneNotes = notesEl ? notesEl.textContent.trim() : null;
			if (notesDrawer.classList.contains('is-open')) renderDrawer();
		},
	});
});

notesToggle.addEventListener('click', () => {
	const isOpen = notesDrawer.classList.toggle('is-open');
	notesToggle.setAttribute('aria-expanded', String(isOpen));
	if (isOpen) renderDrawer();
});

const diagramSection = document.querySelector('[data-scene="todays-model"]');
if (diagramSection) {
	const pieces = diagramSection.querySelectorAll('.diagram-piece');
	gsap.set(pieces, { opacity: 0, y: 12 });

	ScrollTrigger.create({
		trigger: diagramSection,
		start: 'top top',
		end: '+=600',
		pin: true,
		onEnter: () => {
			gsap.to(pieces, {
				opacity: 1,
				y: 0,
				duration: 0.4,
				stagger: 0.2,
				ease: 'power1.out',
			});
		},
		onLeaveBack: () => {
			gsap.set(pieces, { opacity: 0, y: 12 });
		},
	});
}

ScrollTrigger.matchMedia({
	'(min-width: 700px)': function () {
		const demoSection = document.querySelector('[data-scene="demo-two-people"]');
		if (!demoSection) return;
		const panelA = demoSection.querySelector('.demo-panel-a');
		const panelB = demoSection.querySelector('.demo-panel-b');

		gsap.set(panelA, { xPercent: -110 });
		gsap.set(panelB, { xPercent: 110 });

		ScrollTrigger.create({
			trigger: demoSection,
			start: 'top top',
			end: '+=500',
			pin: true,
			scrub: true,
			animation: gsap.to([panelA, panelB], {
				xPercent: 0,
				ease: 'none',
			}),
		});
	},
	'(max-width: 699px)': function () {
		// Below the breakpoint: no pin, no split entrance — the baseline
		// scene reveal from Task 4 already handles this scene like any
		// other, panels stack vertically via existing responsive CSS.
	},
});
