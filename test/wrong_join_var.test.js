const _code1 = `
var_F = 2;
var_G = 2;
var_H = 2;

A;
FORK ROT_C;
FORK ROT_D;
FORK ROT_E;
B;
JOIN var_F, ROT_F, QUIT;

ROT_C: C;
       JOIN var_F, ROT_F, QUIT;

ROT_D: D;
       JOIN var_G, ROT_G, QUIT;

ROT_E: E;
       JOIN var_H, ROT_H, QUIT;

ROT_F: F;
       JOIN var_G, ROT_G, QUIT;

ROT_G: G;
       JOIN var_H, ROT_H, QUIT;

ROT_H: H;
       QUIT;
`;

const _code2 = `
var_E = 2;

FORK ROT_C;
A;
B;
JOIN var_E, ROT_E, QUIT;

ROT_C: C;
       D;
       JOIN var_E, ROT_E, QUIT;

ROT_E: E;
       F;
       QUIT;

`;

const _code3 = `
var_R5 = 2;
var_R6 = 2;
var_R7 = 2;

FORK ROT_R4;
R1;
FORK ROT_R3;
R2;
JOIN var_R5, ROT_R5, QUIT;

ROT_R4: R4;
        JOIN var_R6, ROT_R6, QUIT;

ROT_R3: R3;
        FORK ROT_R6';
JOIN var_R5, ROT_R5, QUIT;

ROT_R5: R5;
	JOIN var_R7, ROT_R7, QUIT;

ROT_R6: R6;
	JOIN var_R7, ROT_R7, QUIT;

ROT_R6': JOIN var_R6, ROT_R6, QUIT;

ROT_R7: R7;
	QUIT;
`;
