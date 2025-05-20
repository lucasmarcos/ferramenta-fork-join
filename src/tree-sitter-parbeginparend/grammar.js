module.exports = grammar({
  name: "parbeginparend",
  extras: ($) => [/\s/, $._comment],
  rules: {
    source_file: ($) => repeat($._statement),
    _statement: ($) => choice($.begin, $.end, $.parbegin, $.parend, $.call),
    begin: ($) => "BEGIN",
    end: ($) => "END",
    parbegin: ($) => "PARBEGIN",
    parend: ($) => "PAREND",
    label: ($) => /[a-zA-Z_][a-zA-Z_0-9]*/,
    call: ($) => seq($.label, ";"),
    _comment: ($) => seq("//", /.*/),
  },
});
