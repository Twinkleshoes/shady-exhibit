/** Original locally generated visitor designs. This pool is public and shared by
 * players and NPCs; neither roles nor badges determine a visitor's clothing. */
export const APPEARANCES=[
 {skin:0xc58d68,hair:0x332820,top:0x547a87,bottom:0x353d4a,style:'sweater',hairStyle:'short',bag:true,hat:false},
 {skin:0x805438,hair:0x211d1b,top:0xb87961,bottom:0x4d5144,style:'jacket',hairStyle:'curls',bag:false,hat:false},
 {skin:0xe4b99a,hair:0x62402a,top:0x75826a,bottom:0x364650,style:'skirt',hairStyle:'bob',bag:false,hat:false},
 {skin:0xa86d4e,hair:0x262222,top:0x9a7d56,bottom:0x313b46,style:'sweater',hairStyle:'pony',bag:true,hat:false},
 {skin:0xf0ceac,hair:0x89715b,top:0x777799,bottom:0x4e403a,style:'jacket',hairStyle:'short',bag:false,hat:true},
 {skin:0x674632,hair:0x191a1b,top:0xc1ac82,bottom:0x4d5861,style:'skirt',hairStyle:'curls',bag:true,hat:false},
 {skin:0xd6a17e,hair:0x3c2923,top:0x9c6570,bottom:0x3d4b4c,style:'sweater',hairStyle:'bob',bag:false,hat:false},
 {skin:0x997051,hair:0x746451,top:0x4b6c5f,bottom:0x555463,style:'jacket',hairStyle:'pony',bag:true,hat:false},
 {skin:0xe8c1a2,hair:0x252a30,top:0x6f829e,bottom:0x51443e,style:'skirt',hairStyle:'short',bag:false,hat:false},
 {skin:0xb57c59,hair:0x2e231f,top:0xae8f62,bottom:0x3d454d,style:'sweater',hairStyle:'curls',bag:false,hat:true},
 {skin:0x75503b,hair:0x27211f,top:0x8e767b,bottom:0x3b4c50,style:'jacket',hairStyle:'bob',bag:true,hat:false},
 {skin:0xdbb393,hair:0x835535,top:0x688575,bottom:0x4c4654,style:'skirt',hairStyle:'pony',bag:false,hat:false},
] as const;
export type VisitorAction='idle'|'walk'|'admire'|'captured';
export const appearanceFor=(id=0)=>APPEARANCES[((Math.trunc(id)%APPEARANCES.length)+APPEARANCES.length)%APPEARANCES.length];
