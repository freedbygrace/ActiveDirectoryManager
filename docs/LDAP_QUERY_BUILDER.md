# LDAP Query Builder Documentation

The LDAP Query Builder is a powerful feature that allows administrators to visually construct, test, save, and manage complex LDAP filters without requiring specialized knowledge of LDAP filter syntax.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [User Interface](#user-interface)
- [Building Queries](#building-queries)
  - [Basic Conditions](#basic-conditions)
  - [Condition Groups](#condition-groups)
  - [Operators](#operators)
  - [Generated LDAP Filter](#generated-ldap-filter)
- [Testing Filters](#testing-filters)
- [Saving and Managing Filters](#saving-and-managing-filters)
- [Version History](#version-history)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

LDAP (Lightweight Directory Access Protocol) is used to query and modify directory services, but writing complex LDAP filters requires specialized knowledge of the syntax. The LDAP Query Builder provides a visual interface to simplify this process, allowing administrators to:

- Create complex filters through a user-friendly interface
- Test filters against live Active Directory data
- Save frequently used filters for reuse
- Track changes with version history
- Revert to previous versions when needed

## Getting Started

To access the LDAP Query Builder:

1. Log in to the Active Directory Management Platform
2. Navigate to **Administration** in the sidebar
3. Click on **LDAP Query Builder**

You'll need at least one configured LDAP connection before you can use the Query Builder. If you haven't set up a connection yet, go to **LDAP Connections** first.

## User Interface

The LDAP Query Builder interface consists of several key sections:

1. **Connection Settings**: Select an LDAP connection and object class
2. **Filter Builder**: Create and edit the filter conditions
3. **Generated Filter**: View the resulting LDAP filter syntax
4. **Saved Filters**: Access previously saved filters
5. **Test Results**: View the results when testing a filter

## Building Queries

### Basic Conditions

To build a query:

1. Select a connection and object class (e.g., User, Group, Computer)
2. Enter a name and optional description for your filter
3. Click **Add Condition** to add your first condition
4. For each condition, select:
   - **Attribute**: The Active Directory attribute to filter by
   - **Operator**: How to match the attribute (equals, contains, etc.)
   - **Value**: The value to match against (not required for exists/not exists)

Example: Finding users with "Smith" in their last name:
- Attribute: `sn` (surname)
- Operator: `contains`
- Value: `Smith`

### Condition Groups

For more complex queries, you can use condition groups:

1. Choose the filter type at the top:
   - **Match ALL conditions (AND)**: All conditions must be true
   - **Match ANY condition (OR)**: Any condition can be true
2. Add multiple conditions as needed
3. Use the **Add Group** button to create nested logic (limited in current version)

### Operators

The following operators are available:

| Operator | Description | LDAP Equivalent |
|----------|-------------|-----------------|
| Equals | Exact match | (attribute=value) |
| Not equals | Negated exact match | (!(attribute=value)) |
| Contains | Value appears anywhere | (attribute=*value*) |
| Starts with | Value appears at beginning | (attribute=value*) |
| Ends with | Value appears at end | (attribute=*value) |
| Exists | Attribute is present | (attribute=*) |
| Not exists | Attribute is not present | (!(attribute=*)) |

### Generated LDAP Filter

As you build your query, the system automatically generates the corresponding LDAP filter syntax in the "Generated LDAP Filter" field. Advanced users can modify this syntax directly, but be aware that manual edits won't be reflected in the visual builder.

## Testing Filters

To test a filter against your Active Directory:

1. Build your filter as described above
2. Click the **Test Filter** button
3. View the matching results in the "Test Results" tab
4. The results show objects that match your filter criteria

The test results display key attributes such as names and distinguished names (DNs).

## Saving and Managing Filters

To save a filter for later use:

1. Enter a descriptive name in the "Filter Name" field
2. Optionally add a description
3. Click the **Save Filter** button

To manage saved filters:

1. View your saved filters in the "Saved Filters" tab
2. Click the pencil icon to edit a filter
3. Click the trash icon to delete a filter
4. Click on a filter row to select it for viewing or editing

## Version History

The system automatically maintains a version history for each filter:

1. When editing a saved filter, click the **Show History** button
2. View the revision history, including version numbers, timestamps, and comments
3. To revert to a previous version, click the **Revert to this version** button
4. Confirm the revert action in the confirmation dialog

When you revert to a previous version, a new revision is created with the reverted content, preserving the full history.

## Advanced Usage

### Direct LDAP Syntax Editing

Advanced users can edit the generated LDAP filter syntax directly:

1. Make changes in the "Generated LDAP Filter" field
2. Be aware that manual edits won't update the visual builder interface
3. The manually edited filter will still be used when testing or saving

### Complex Filters with Nested Logic

While the current version has limited support for deeply nested conditions, you can create complex filters by:

1. Using the top-level AND/OR operator effectively
2. Adding multiple simple conditions
3. Using selective attribute queries
4. For very complex queries, consider direct LDAP syntax editing

## Troubleshooting

Common issues and solutions:

### No Test Results

If your filter doesn't return any results:
- Check that the attribute names are correct
- Verify the values you're searching for
- Ensure the object class is appropriate for the attributes
- Check the LDAP connection status
- Try a simpler query first to verify connectivity

### Syntax Errors

If your filter has syntax errors:
- Look for unmatched parentheses
- Check attribute names for typos
- Ensure values are properly formatted

### Performance Issues

If queries are slow:
- Avoid wildcard searches at the beginning of values when possible
- Use more specific filters
- Check if the attributes you're filtering on are indexed
- Limit result sets with more specific criteria

## Best Practices

For effective use of the LDAP Query Builder:

1. **Use descriptive names**: Make filter names clear and descriptive
2. **Add helpful descriptions**: Document the purpose and expected results
3. **Start simple**: Begin with simple conditions and build complexity gradually
4. **Test thoroughly**: Always test filters before deploying them
5. **Use version comments**: Add meaningful comments when updating filters
6. **Organize filters logically**: Create separate filters for different purposes
7. **Use AND/OR appropriately**: Understand how condition logic affects results
8. **Be specific**: More specific filters perform better and return more relevant results