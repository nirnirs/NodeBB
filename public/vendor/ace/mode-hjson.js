define("ace/mode/hjson_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"],function(e,t,n){"use strict";var r=e("../lib/oop"),i=e("./text_highlight_rules").TextHighlightRules,s=function(){this.$rules={start:[{include:"#comments"},{include:"#rootObject"},{include:"#value"}],"#array":[{token:"paren.lparen",regex:/\[/,push:[{token:"paren.rparen",regex:/\]/,next:"pop"},{include:"#value"},{include:"#comments"},{token:"text",regex:/,|$/},{token:"invalid.illegal",regex:/[^\s\]]/},{defaultToken:"array"}]}],"#comments":[{token:["comment.punctuation","comment.line"],regex:/(#)(.*$)/},{token:"comment.punctuation",regex:/\/\*/,push:[{token:"comment.punctuation",regex:/\*\//,next:"pop"},{defaultToken:"comment.block"}]},{token:["comment.punctuation","comment.line"],regex:/(\/\/)(.*$)/}],"#constant":[{token:"constant",regex:/\b(?:true|false|null)\b/}],"#keyname":[{token:"keyword",regex:/(?:[^,\{\[\}\]\s]+|"(?:[^"\\]|\\.)*")\s*(?=:)/}],"#mstring":[{token:"string",regex:/'''/,push:[{token:"string",regex:/'''/,next:"pop"},{defaultToken:"string"}]}],"#number":[{token:"constant.numeric",regex:/-?(?:0|[1-9]\d*)(?:(?:\.\d+)?(?:[eE][+-]?\d+)?)?/,comment:"handles integer and decimal numbers"}],"#object":[{token:"paren.lparen",regex:/\{/,push:[{token:"paren.rparen",regex:/\}/,next:"pop"},{include:"#keyname"},{include:"#value"},{token:"text",regex:/:/},{token:"text",regex:/,/},{defaultToken:"paren"}]}],"#rootObject":[{token:"paren",regex:/(?=\s*(?:[^,\{\[\}\]\s]+|"(?:[^"\\]|\\.)*")\s*:)/,push:[{token:"paren.rparen",regex:/---none---/,next:"pop"},{include:"#keyname"},{include:"#value"},{token:"text",regex:/:/},{token:"text",regex:/,/},{defaultToken:"paren"}]}],"#string":[{token:"string",regex:/"/,push:[{token:"string",regex:/"/,next:"pop"},{token:"constant.language.escape",regex:/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/},{token:"invalid.illegal",regex:/\\./},{defaultToken:"string"}]}],"#ustring":[{token:"string",regex:/\b[^:,0-9\-\{\[\}\]\s].*$/}],"#value":[{include:"#constant"},{include:"#number"},{include:"#string"},{include:"#array"},{include:"#object"},{include:"#comments"},{include:"#mstring"},{include:"#ustring"}]},this.normalizeRules()};s.metaData={fileTypes:["hjson"],foldingStartMarker:"(?x:     # turn on extended mode\n              ^    # a line beginning with\n              \\s*    # some optional space\n              [{\\[]  # the start of an object or array\n              (?!    # but not followed by\n              .*   # whatever\n              [}\\]]  # and the close of an object or array\n              ,?   # an optional comma\n              \\s*  # some optional space\n              $    # at the end of the line\n              )\n              |    # ...or...\n              [{\\[]  # the start of an object or array\n              \\s*    # some optional space\n              $    # at the end of the line\n            )",foldingStopMarker:"(?x:   # turn on extended mode\n             ^    # a line beginning with\n             \\s*  # some optional space\n             [}\\]]  # and the close of an object or array\n             )",keyEquivalent:"^~J",name:"Hjson",scopeName:"source.hjson"},r.inherits(s,i),t.HjsonHighlightRules=s}),define("ace/mode/folding/cstyle",["require","exports","module","ace/lib/oop","ace/range","ace/mode/folding/fold_mode"],function(e,t,n){"use strict";var r=e("../../lib/oop"),i=e("../../range").Range,s=e("./fold_mode").FoldMode,o=t.FoldMode=function(e){e&&(this.foldingStartMarker=new RegExp(this.foldingStartMarker.source.replace(/\|[^|]*?$/,"|"+e.start)),this.foldingStopMarker=new RegExp(this.foldingStopMarker.source.replace(/\|[^|]*?$/,"|"+e.end)))};r.inherits(o,s),function(){this.foldingStartMarker=/(\{|\[)[^\}\]]*$|^\s*(\/\*)/,this.foldingStopMarker=/^[^\[\{]*(\}|\])|^[\s\*]*(\*\/)/,this.singleLineBlockCommentRe=/^\s*(\/\*).*\*\/\s*$/,this.tripleStarBlockCommentRe=/^\s*(\/\*\*\*).*\*\/\s*$/,this.startRegionRe=/^\s*(\/\*|\/\/)#?region\b/,this._getFoldWidgetBase=this.getFoldWidget,this.getFoldWidget=function(e,t,n){var r=e.getLine(n);if(this.singleLineBlockCommentRe.test(r)&&!this.startRegionRe.test(r)&&!this.tripleStarBlockCommentRe.test(r))return"";var i=this._getFoldWidgetBase(e,t,n);return!i&&this.startRegionRe.test(r)?"start":i},this.getFoldWidgetRange=function(e,t,n,r){var i=e.getLine(n);if(this.startRegionRe.test(i))return this.getCommentRegionBlock(e,i,n);var s=i.match(this.foldingStartMarker);if(s){var o=s.index;if(s[1])return this.openingBracketBlock(e,s[1],n,o);var u=e.getCommentFoldRange(n,o+s[0].length,1);return u&&!u.isMultiLine()&&(r?u=this.getSectionRange(e,n):t!="all"&&(u=null)),u}if(t==="markbegin")return;var s=i.match(this.foldingStopMarker);if(s){var o=s.index+s[0].length;return s[1]?this.closingBracketBlock(e,s[1],n,o):e.getCommentFoldRange(n,o,-1)}},this.getSectionRange=function(e,t){var n=e.getLine(t),r=n.search(/\S/),s=t,o=n.length;t+=1;var u=t,a=e.getLength();while(++t<a){n=e.getLine(t);var f=n.search(/\S/);if(f===-1)continue;if(r>f)break;var l=this.getFoldWidgetRange(e,"all",t);if(l){if(l.start.row<=s)break;if(l.isMultiLine())t=l.end.row;else if(r==f)break}u=t}return new i(s,o,u,e.getLine(u).length)},this.getCommentRegionBlock=function(e,t,n){var r=t.search(/\s*$/),s=e.getLength(),o=n,u=/^\s*(?:\/\*|\/\/|--)#?(end)?region\b/,a=1;while(++n<s){t=e.getLine(n);var f=u.exec(t);if(!f)continue;f[1]?a--:a++;if(!a)break}var l=n;if(l>o)return new i(o,r,l,t.length)}}.call(o.prototype)}),define("ace/mode/hjson",["require","exports","module","ace/lib/oop","ace/mode/text","ace/mode/hjson_highlight_rules","ace/mode/folding/cstyle"],function(e,t,n){"use strict";var r=e("../lib/oop"),i=e("./text").Mode,s=e("./hjson_highlight_rules").HjsonHighlightRules,o=e("./folding/cstyle").FoldMode,u=function(){this.HighlightRules=s,this.foldingRules=new o};r.inherits(u,i),function(){this.lineCommentStart="//",this.blockComment={start:"/*",end:"*/"},this.$id="ace/mode/hjson"}.call(u.prototype),t.Mode=u})