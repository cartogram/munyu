import { launch } from './cdp.mjs';
import { exposeST, actTriggers, visible } from './st.mjs';

const b = await launch();
await b.goto('http://localhost:8123/index.html');
await exposeST(b);
const trig = await b.eval(actTriggers);
console.log('viewport 800; triggers:');
trig.forEach((t) => console.log('  ', JSON.stringify(t)));
console.log('docHeight', await b.eval('document.documentElement.scrollHeight'));

async function sample(label, y) {
	await b.scrollTo(y, 900);
	const v = await b.eval(visible);
	console.log(`\n[${label}] y=${v.y}`);
	v.acts.forEach((a) => console.log(`   act ${a.act} top=${a.top} bottom=${a.bottom} opacity=${a.opacity} transform=${a.scale} inner=${a.innerY} pos=${a.pos}`));
	console.log('   headings on screen:', v.headings.map((h) => `${h.scene}@${h.top}`).join(', ') || '(none)');
	await b.shot(`task5-${label}`);
}

const [hyp, ur] = trig;
// 1. hypothesis (short/no-fake-scroll path expected)
await sample('hyp-before', hyp.start - 200);
await sample('hyp-mid', Math.round((hyp.start + hyp.end) / 2));
await sample('hyp-after', hyp.end + 50);
// 2. user-research (tall act)
await sample('ur-early', ur.start - 2000);
await sample('ur-late', ur.start - 100);
const span = ur.end - ur.start;
await sample('ur-25', Math.round(ur.start + span * 0.25));
await sample('ur-50', Math.round(ur.start + span * 0.5));
await sample('ur-80', Math.round(ur.start + span * 0.8));
await sample('ur-after', ur.end + 50);
// 3. backup-qa: last act, no trigger expected
console.log('\nbackup-qa has trigger?', trig.some((t) => t.act === 'backup-qa'));
const maxY = await b.eval('document.documentElement.scrollHeight - innerHeight');
await sample('bottom', maxY);
console.log('errors:', b.errors.length ? b.errors : 'none');
await b.close();
