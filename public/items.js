export const ITEMS=[
{id:"wood",name:"Wood",rarity:"common",value:2},
{id:"stone",name:"Stone",rarity:"common",value:3},
{id:"iron",name:"Iron",rarity:"uncommon",value:8},
{id:"gold",name:"Gold",rarity:"rare",value:20},
{id:"diamond",name:"Diamond",rarity:"epic",value:60}
];
export const ITEM_MAP=Object.fromEntries(ITEMS.map(i=>[i.id,i]));
