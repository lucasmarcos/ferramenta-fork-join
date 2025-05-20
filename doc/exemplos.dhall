{ exemplos =
  [ { codigo =
        ''
        VAR_J = 2;

        C1;
        FORK ROT_C3;
        C2;
        JOIN VAR_J, ROT_C4, QUIT;

        ROT_C3:
          C3;
          JOIN VAR_J, ROT_C4, QUIT;

        ROT_C4:
          C4;
        ''
    , nome = "Exemplo 1"
    }
  , { codigo =
        ''
        VAR_C5=2;
        VAR_C6=2;

        C1;
        FORK ROT_C3;
        FORK ROT_C4;
        C2;
        JOIN VAR_C5, ROT_C5, QUIT;

        ROT_C3: C3;
          JOIN VAR_C5, ROT_C5, QUIT;

        ROT_C4: C4;
          JOIN VAR_C6, ROT_C6, QUIT;

        ROT_C5: C5;
          JOIN VAR_C6, ROT_C6, QUIT;

        ROT_C6: C6;
          QUIT;
        ''
    , nome = "Exemplo 2"
    }
  , { codigo =
        ''
        VAR_D=2;
        VAR_E=2;

        A;
        FORK ROT_C;
        B;
        FORK ROT_E';
        JOIN VAR_D, ROT_D, QUIT;

        ROT_C: C;
          JOIN VAR_D, ROT_D, QUIT;

        ROT_D: D;
          JOIN VAR_E , ROT_E , QUIT ;

        ROT_E': JOIN VAR_E, ROT_E, QUIT;

        ROT_E: E;
          QUIT;
        ''
    , nome = "Exemplo 3"
    }
  , { codigo =
        ''
        VAR_D = 3;

        A;
        B;
        FORK B1;
        FORK B2;
        C;
        D;
        JOIN VAR_D, D1, QUIT;

        B1:
          JOIN VAR_D, D1, QUIT;

        B2:
          JOIN VAR_D, D1, QUIT;

        D1:
          QUIT;
        ''
    , nome = "Linear"
    }
  , { codigo =
        ''
        ROT_CALL;
        ROT_CALL;
        ROT_CALL;

        ROT_CALL:
          A;
          QUIT;
        ''
    , nome = "Calls"
    }
  , { codigo =
        ''
        A;
        FORK ROT_C;
        JOIN VAR_C, ROT_D, QUIT;

        ROT_C:
          C;
          JOIN VAR_C, ROT_D, QUIT;

        ROT_D:
          D;
        ''
    , nome = "Borked JOIN"
    }
  , { codigo =
        ''
        ROT_A;

        ROT_A:
          ROT_B;

        ROT_B:
          ROT_C;

        ROT_C:
          START;
        ''
    , nome = "Nested"
    }
  , { codigo =
        ''
        ROT_A;

        ROT_A:
          ROT_B;

        ROT_B:
          ROT_A;
        ''
    , nome = "Recursive"
    }
  ]
}
