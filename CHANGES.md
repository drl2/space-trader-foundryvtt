# Space Trader ApplicationV2 Conversion

## Summary
This pull request converts the Space Trader module from jQuery and FormApplication to native DOM APIs and ApplicationV2 architecture for Foundry VTT v12+ compatibility.

## Changes Made

### Architecture Updates
- **Converted from FormApplication to ApplicationV2** with HandlebarsApplicationMixin
- **Replaced jQuery with native DOM APIs** throughout all JavaScript files
- **Implemented PARTS-based template system** for better modularity
- **Added proper tab system** with manual initialization

### File Changes

#### JavaScript Files
- `scripts/space-trader.js` - Main application converted to ApplicationV2
- `scripts/map-lookup.js` - Converted to ApplicationV2 
- `scripts/freight-sale.js` - Converted to ApplicationV2
- `scripts/chat.js` - Updated to use native DOM APIs
- `scripts/trade-config.js` - Updated to use native DOM APIs
- `scripts/trade-goods.js` - Updated to use native DOM APIs
- `scripts/utility.js` - Updated to use native DOM APIs

#### Template Files
- `templates/parts/settings.hbs` - Updated to use modern `{{selectOptions}}` helper
- All template files - Removed nested `<form>` elements for ApplicationV2 compatibility

### Technical Improvements
- **Removed all jQuery dependencies** - Complete conversion to native DOM
- **Fixed deprecated Handlebars helpers** - Updated `{{select}}` to `{{selectOptions}}`
- **Implemented proper context menu integration** - Added `getActorContextOptions` hook
- **Added manual form change handling** - Required for ApplicationV2 form persistence
- **Clean console output** - Removed debug logging for production

### Compatibility
- **Foundry VTT v12+** - Full compatibility with latest ApplicationV2 architecture
- **No breaking changes** - All existing functionality preserved
- **Modern JavaScript** - Uses ES6+ features and best practices

### Testing
- ✅ Application opens correctly
- ✅ All tabs function properly  
- ✅ Form submissions work
- ✅ Context menu integration
- ✅ No console errors or deprecation warnings
- ✅ All trading functionality preserved

## Migration Benefits
- **Future-proof** - Uses modern Foundry APIs
- **Better performance** - Native DOM is faster than jQuery
- **Cleaner code** - More maintainable and readable
- **Standards compliance** - Follows Foundry v12+ best practices