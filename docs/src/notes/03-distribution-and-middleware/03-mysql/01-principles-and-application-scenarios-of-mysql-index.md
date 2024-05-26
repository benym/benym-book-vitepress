---
title: MySQL索引原理及应用场景
description: MySQL索引总结
categories: 
  - MySQL
tags: 
  - MySQL
  - 索引
  - B+树
keywords: MySQL,索引,B+树
date: 2022-08-02 18:56:07
permalink: /pages/0f7e8e/
author: 
  name: benym
  link: https://github.com/benym
---

# MySQL索引原理及应用场景

## 什么是索引

在工作当中，涉及到MySQL的查询，我们经常会遇到给某个表某个字段加索引的诉求，加上索引能够让我们的sql得到查询速度上的提升。但索引的原理是什么呢，他又是怎么工作的，需要开发者对基础知识有一定的了解。

## 索引分类

索引通过特定的一些数据结构，将数据组织有序，将随机I/O变为顺序I/O，有效减少查询一条数据所需要扫描的数据量，加快查询的速度。

从使用者的角度而言，MySQL索引主要为以下几种。

**主键索引**

根据数据表主键建立的索引，不允许重复和空值。主键索引列全表唯一

```sql
alter table 'table_name' add primary key pk_index_name('col_name');
```

**唯一索引**

用于确保建立索引列内的值是唯一的，允许空值。比如同样为age字段，不能出现2个age为10的数据

```sql
alter table 'table_name' add unique unique_index_name('col_name');
```

**普通索引**

用于表中的普通列构建的索引，没有特殊限制

```sql
alter table 'table_name' add index index_name('col_name');
```

**联合索引**

采用多个列组合构建的索引，用于组合搜索

```sql
alter table 'table_name' add index index_name('col1_name','col2_name');
```

**全文索引**

用于大文本对象的列构建索引

```sql
alter table 'table_name' add fulltext index full_index_name('col_name');
```

**空间索引**

用于GIS地图数据的索引，MySQL中的空间数据类型有GEOMETRY、POINT、LINESTRING、POLYGON

```sql
alter table 'table_name' add spatial index spa_index_name('col_name');
```

## 索引数据结构

根据数据结构的不同，MySQL的索引可分为`哈希索引`、`BTree索引`、`B+Tree索引`。

**哈希索引**

哈希索引通过hash表实现，通过将hash函数计算出的hash值存储在索引中，来完成key-value的快速查询

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/mysql-hash.png/zipstyle)

通常而言当发生hash碰撞之后(即两个key在经过hash函数之后值为同一个)，采用链地址法解决冲突，如上图中小刘到小王的连接线，获取key找到索引地址之后，顺序遍历地址内的链表，获得最终结果。

哈希索引的特点和hashmap类似，适合于精确查找，但不适合范围查找，hash码并不具有规律性，所以存储hash索引时顺序性是无法保障的。

**BTree索引**

关于平衡二叉搜索树的概念和意义可以详见我的另一篇文章👉[二叉搜索树及AVL树详解](https://cloud.benym.cn/benym-book/pages/2efaaf/)。

B树实际上是一棵多叉平衡搜索树。其具有以下特点

::: note

根节点左侧数值小于根节点，根节点右侧数值大于根节点

每个叶子节点高度一致

指针p存储节点的地址信息

非叶子节点为[key,data]二元组，其中key表示作为索引的键，data为key值所在行的数据

:::

B树的结构如下图所示

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/mysql-btree.png/zipstyle)

在B树的结构图中，可以发现每个节点不仅仅包含数据的Key值，还有data值。

而每页的存储空间是有限的，如果data比较大，会导致每个节点的Key存储较少。

当数据量扩大时，B树只能往下进行分裂，导致树深的增高，增加了磁盘I/O的次数，影响查询效率。

**B+Tree索引**

为了解决B树的效率问题，B+树做了如下改进

::: note

非叶子节点只存储键值信息，不再存储数据

所有叶子节点之间都有一个链指针，指向下一个叶子节点

数据都存放在叶子节点中

:::

B+树的结构如下图所示

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/mysql-b%2Btree.png/zipstyle)

为了更详细的描述B+树，图中的指针写明了存储的磁盘块名称，最底下一层含有数据的磁盘块被称为**数据页**，数据页之间通过双向链表进行连接，非叶子节点的磁盘块被称为**索引页**

将上图中磁盘块2与磁盘块5、6、7拿出来进行细分，我们展开各磁盘块，查看单个磁盘块内数据的排列方式

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/mysql-b%2Btree-data.png/zipstyle)

MySQL在存储数据时以数据页为最小单位，且数据在数据页中的存储是**连续**的，数据页中的数据是按照主键排序(如没有主键则由MySQL自身维护的ROW_ID排序)，而数据页与数据页之间则采用**双向链表**关联，数据与数据之间通过**单向链表**关联。

在每个数据页中，必然存在最小主键，每个数据页的最小主键+磁盘块地址会形成一个主键目录，多个主键目录会形成一个索引页(如磁盘块2结构所示)。

::: tip

索引页的出现就是为了解决数据页记录过多，导致主键目录特别大，影响二分查找效率的问题。

与数据页类似，如果一张数据页/索引页存储空间不够，则继续分裂到下一张，即结构图中展示的磁盘块1、2、3、4均为索引页

:::

**那么索引页和数据页到底是多大的大小呢**？

引用一下网络中的解释

> 计算机在存储数据的时候，最小存储单元是扇区，一个扇区的大小是 512 字节，而文件系统（例如 XFS/EXT4）最小单元是块，一个块的大小是 4KB。InnoDB 引擎存储数据的时候，是以页为单位的，每个数据页的大小默认是 16KB，即四个块。

基于该理论，我们可以大致算出B+树能够存储的数据。

假设数据库中一条记录是`1KB`，那么一个页就可以存`16`条数据（叶子结点）；对于非叶子结点存储的则是键值+指针，在InnoDB中，一个指针的大小是`6`个字节，假设我们的主键是bigint ，那么主键占`8`个字节，忽略一些其他的头信息大小，大致计算可以得到：

::: center
`16*1024/(8+6)=1170`
:::

即一个非叶子节点可以指向1170个页，那么一个三层的B+树可以存储的数据量为：

::: center
`1170*1170*16=21902400`
:::

大约2100万条数据。

在InnoDB存储引擎中，B+树的高度一般为2-4 层，这就可以满足千万级的数据的存储，查找数据的时候，一次页的查找代表一次I/O，那我们通过主键索引查询的时候，其实最多只需要2-4次I/O操作就可以了。

## B+Tree的查询过程

还是基于B+树的结构图

假设我们要查询`key=16`的数据，通过最顶层索引页的条件，我们知道需要从磁盘块2的索引页进行查询。

依次比较磁盘块2中的`key`值，能够知道`key>=12`的数据均在`p6`指针指向的磁盘块内。

于是我们可以定位到磁盘块7对应的数据页，通过顺序遍历数据页内的单向链表，最终找到`key=16`对应的`data`数据行。

## 聚簇索引与非聚簇索引

作为非常高频的知识点，这两种索引通常会有如下解释

::: note

聚簇索引的叶子节点存储的是键值对应的数据本身

非聚簇索引的叶子节点存储的是键值对应的数据的主键键值

:::

在Innodb中聚簇索引一般默认以主键建立，也称为**主键索引**

非聚簇索引则以其他非主键字段建立，也称为**辅助索引**

以下列数据表为例
::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/mysql-table.png/zipstyle)
:::

如果采用聚簇索引的存储方式(主键为ID)，则对应的索引结构为

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/mysql-clus.png/zipstyle)

可以看出**聚簇索引的数据和索引存储在一起**，根据Id索引能够找到对应的数据行，比如`where Id = 7`这样的条件，聚簇索引能够查到对应主键，获得对应的叶子节点上的行数据。

如果以Name字段建立索引，则对应的辅助索引结构为

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/mysql-noclus.png/zipstyle)

可以看出**非聚簇索引的数据和索引，并非存储在一起**，根据Name索引只能找到Name对应的主键Id，比如`where Name = 张三`，非聚簇索引需要通过**两个步骤**才能获取行数据。

- 第一步，在非聚簇索引的B+树中查询对应Name，获得叶子节点上匹配的Name的主键。

- 第二步，根据匹配的主键Id在聚簇索引B+树上再执行一次检索，获取叶子节点上的行数据。

整个过程可如下图所示

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/mysql-search.png/zipstyle)

两者的主要区别在于**非聚簇索引会多一次查询聚簇索引的过程**

## 索引优化
### 回表

**回表是什么**？

假设有如下Sql执行

```sql
select * from student where name = '张三';
```

由于查询键为name，所以查询时走辅助索引树，很快就定位到了`Name=张三`的叶子节点，但由于查询条件为`select *`，辅助索引树中并没有包含全表字段，所以会再次根据`Name=张三`的主键Id查询主键索引树。

这个过程和刚才非聚簇索引的查询过程相同，通过辅助索引查询到字段，但仍需要走主键索引补全select信息的过程，叫做**回表**。

### 索引覆盖

索引覆盖就是执行的sql查询的字段刚好可以命中索引，不需要额外回表

例如

```sql
select id from student where id = 123
```

这样的查询能够命中索引，且索引字段和查询字段匹配

而例如

```sql
select id, name from student where id = 123
```

这样的查询则会回表

### 联合索引

作为下文的基础，这里先说一下联合索引。

假设现在有如下场景，按照市民的身份证号去查询他的家庭地址，这个查询需求在业务中出现的概率不高，但我们也不能让他直接走全表扫描。

如果单独的为一个不频繁的查询请求创建一个索引，感觉又有点浪费资源，这时候就可以通过建立联合索引，减少开销。

假设以数据库的`a`字段和`b`字段建立联合索引，`a`和`b`均为`int`类型字段

```sql
alter table 'table_name' add index index_name('a','b');
```

则生成的联合索引B+树会以联合索引字段共同建立，即联合索引的键值对大于1个

::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/mysql-unindex.png/zipstyle)
:::

将索引的叶子节点按照字段拿出来进行分析，从左至右

a的顺序为: 1, 1, 2, 2, 3, 3

b的顺序为: 1, 2, 1, 4, 1, 2

大家可以发现`a`字段是有序排列，`b`字段是无序排列(因为B+树只能选择一个字段来构建有序的树)

同时通过观察还可以发现，**在a相等的情况下，b字段是有序的**，即此时`a=1`时，`b=1，2`，b保持相对有序。

在平时的sql中，我们经常会有个共识，当要对两个字段进行排序时，首先会按照第一个字段排序，如果第一个字段相等，则用第二个字段排序。

这种共识的原理就是因为，联合多字段建树时B+树的独特构建方式。

### 最左前缀原则

有了联合索引的概念，最左前缀原则就好理解了，由于B+树的建树方式，只有叶子节点存储数据，且叶子节点从左往右排序保持顺序，是最左前缀匹配的根本原因。

如果要查询`a`字段所有以`1`开头的数据，则对应的`SQL`条件为`where a like '1%'`。这个时候索引能够用上，查找到第一个符合条件的记录为`ID-1`,然后一直向后遍历，直到不满足条件为止。

再举一个能走联合索引的例子，如`select * from student where a=1 and b=2`。

- 首先a字段在B+树上是有序的，所以我们通过二分查找来定位到a=1的位置，其次在a确定的情况下，b是相对有序的。因为有序，所以我们同样可以通过二分查找找到b=2的位置。此时索引是有效的。


再举一个不能走联合索引的例子，如`select * from student where b=2`。

- b字段有序的前提是：在a确定的情况下，现在查询条件中并没有规定a的范围，所以也无法确定b的顺序，在一棵无序的B+树上是无法用二分查找来定位到b字段的，这个时候索引失效。


### 索引下推

最左前缀可以用在索引中定位记录，那么那些不符合最左前缀的部分会怎么样呢？

还是以联合索引(a, b)为例，假设现在表内有`a,b,c,d...`多个字段，如果现在有一个需求：检索出表中a字段第一个数字为1，且b字段为2，c字段为3的所有数据。那么这条Sql语句则是这么写的：

```sql
select * from student where a like '1%' and b=2 and c=3;
```

根据前缀规则，这个语句在搜索索引树时，只能用`1`，找到第一个满足条件的记录`ID-1`。

之后则需要判断其他条件是否满足。在MySQL5.6之前，只能从ID1开始一个个回表。到主键索引上找出数据行，再对比字段值。

而MySQL5.6引入的索引下推优化(index condition pushdown)，可以在索引遍历过程中，对索引中包含的字段先做判断，直接过滤掉不满足条件的记录，减少回表次数。

这两个过程可如下图所示。

无索引下推过程，均需要回表

::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/mysql-nounder.png/zipstyle)
:::

索引下推过程

::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/mysql-under.png/zipstyle)
:::

在这两个图中，每个箭头表示回表一次

在无索引下推过程中，InnoDB只需要观察`a`字段的值，按顺序把`a`字段第一个数值为`1`的记录一条条取出来进行回表，所以总计需要回表2次。

索引下推过程的区别在于，InnoDB在(a, b)索引内部就判断了`b`字段是否等于2，对于不等于2的记录，直接判断并跳过。在这个例子中，只需要对ID-2这一条记录回表取数据判断，只需要回表1次。

### 索引分析—执行计划

说了这么多，对于一条SQL，我们分析的思路应该是怎么样的呢？

MySQL提供了`explain`命令，可以用于对SQL的分析，根据分析出的结果，开发者可以针对性的进行优化

::: tip
后续操作基于如下数据表
:::

```sql
create table if not exists testIndex.t_users
(
	id bigint auto_increment comment '自增ID'
		primary key,
	name varchar(50) not null comment '姓名',
	sex int not null comment '性别，0女，1男',
	age int not null comment '年龄',
	info json null comment '信息'
);

INSERT INTO testIndex.t_users (id, name, sex, age, info) VALUES (1, '张三', 1, 15, '{"text": "我是张三"}');
INSERT INTO testIndex.t_users (id, name, sex, age, info) VALUES (2, '李四', 1, 16, '{"text": "我是李四"}');
INSERT INTO testIndex.t_users (id, name, sex, age, info) VALUES (3, '王五', 0, 12, '{"text": "我是王五"}');
```

**如何使用**？

在需要执行的SQL前加上`explain`命令执行即可，如：

```sql
mysql> explain select * from t_users where id < 2 \G;
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: t_users
   partitions: NULL
         type: range
possible_keys: PRIMARY
          key: PRIMARY
      key_len: 8
          ref: NULL
         rows: 1
     filtered: 100.00
        Extra: Using where
1 row in set, 1 warning (0.00 sec)
```

在explain输出的内容中，重点关注`select_type`，`type`，`key`，`rows`，`Extra`

1. select_type: 表示查询类型, 常见值表格如下

::: center
| 查询类型  | 解释 |
| ------- | --------------------------------- |
| SIMPLE | 表示查询语句不包含子查询或者union |
| PRIMARY | 表示此查询最外层的查询 |
| UNION | 表示此查询是union的第二个或者后续的查询 |
| DEPENDENT UNION | union中的第二个或者后续的查询语句使用了外面的查询结果 |
| UNION RESULR | union的结果 |
| SUNQUERY | select子查询语句 |
| DEPENDENT SUBQUERY | select子查询语句依赖外层的查询结果 |
:::

2. type: 表示存储引擎查询数据时采用的方式。是一个比较重要的属性，通过它可以判断出查询是全表扫描还是基于索引的部分扫描。

   它的常见属性如下(从上到下，查询效率依次增强)

- ALL: 全表扫描

```sql
mysql> explain select * from t_users \G;
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: t_users
   partitions: NULL
         type: ALL
possible_keys: NULL
          key: NULL
      key_len: NULL
          ref: NULL
         rows: 3
     filtered: 100.00
        Extra: NULL
1 row in set, 1 warning (0.00 sec)
```

- index: 基于索引的全表扫描，先扫描索引再扫描全表(在排序上性能优于ALL)

```sql
mysql> explain select id from t_users \G;
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: t_users
   partitions: NULL
         type: index
possible_keys: NULL
          key: PRIMARY
      key_len: 8
          ref: NULL
         rows: 3
     filtered: 100.00
        Extra: Using index
1 row in set, 1 warning (0.00 sec)
```

- range: 表示使用索引的范围查询。用>,>=,<,<=等

```sql
mysql> explain select * from t_users where id > 0 \G;
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: t_users
   partitions: NULL
         type: range
possible_keys: PRIMARY
          key: PRIMARY
      key_len: 8
          ref: NULL
         rows: 3
     filtered: 100.00
        Extra: Using where
1 row in set, 1 warning (0.00 sec)
```

- ref: 表示使用非唯一索引进行单值查询

先为age字段创建索引

```sql
mysql> alter table t_users add index `idx_t_user_age` (`age`);
Query OK, 0 rows affected (0.21 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> explain select * from t_users where age = 15 \G;
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: t_users
   partitions: NULL
         type: ref
possible_keys: idx_t_user_age
          key: idx_t_user_age
      key_len: 4
          ref: const
         rows: 1
     filtered: 100.00
        Extra: NULL
1 row in set, 1 warning (0.00 sec)
```

- eq_ref: 一般情况下出现在多表join查询，表示前面表的每一行记录，都只能匹配后面表的一行结果

创建成绩表t_exam

```sql
create table if not exists testIndex.t_exam
(
	id bigint auto_increment comment '自增ID'
		primary key,
	user_id bigint not null comment '用户ID',
	score int null comment '成绩'
);

INSERT INTO testIndex.t_exam (id, user_id, score) VALUES (1, 1, 96);
INSERT INTO testIndex.t_exam (id, user_id, score) VALUES (2, 2, 86);
INSERT INTO testIndex.t_exam (id, user_id, score) VALUES (3, 3, 76);
```

采用多表join查询

```sql
mysql> explain select * from t_users tu left join t_exam te on tu.id = te.user_id where te.score = 96;
+----+-------------+-------+------------+--------+---------------+---------+---------+----------------------+------+----------+-------------+
| id | select_type | table | partitions | type   | possible_keys | key     | key_len | ref                  | rows | filtered | Extra       |
+----+-------------+-------+------------+--------+---------------+---------+---------+----------------------+------+----------+-------------+
|  1 | SIMPLE      | te    | NULL       | ALL    | NULL          | NULL    | NULL    | NULL                 |    3 |    33.33 | Using where |
|  1 | SIMPLE      | tu    | NULL       | eq_ref | PRIMARY       | PRIMARY | 8       | testIndex.te.user_id |    1 |   100.00 | NULL        |
+----+-------------+-------+------------+--------+---------------+---------+---------+----------------------+------+----------+-------------+
2 rows in set, 1 warning (0.00 sec)
```

- const: 表示使用主键或者卫衣索引做等值查询

```sql
mysql> explain select * from t_users where id = 1 \G;
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: t_users
   partitions: NULL
         type: const
possible_keys: PRIMARY
          key: PRIMARY
      key_len: 8
          ref: const
         rows: 1
     filtered: 100.00
        Extra: NULL
1 row in set, 1 warning (0.00 sec)
```

- null: 表示不用访问表，速度最快

```sql
mysql> explain select 1;
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+----------------+
| id | select_type | table | partitions | type | possible_keys | key  | key_len | ref  | rows | filtered | Extra          |
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+----------------+
|  1 | SIMPLE      | NULL  | NULL       | NULL | NULL          | NULL | NULL    | NULL | NULL |     NULL | No tables used |
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+----------------+
1 row in set, 1 warning (0.00 sec)

mysql> explain select now();
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+----------------+
| id | select_type | table | partitions | type | possible_keys | key  | key_len | ref  | rows | filtered | Extra          |
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+----------------+
|  1 | SIMPLE      | NULL  | NULL       | NULL | NULL          | NULL | NULL    | NULL | NULL |     NULL | No tables used |
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+----------------+
1 row in set, 1 warning (0.00 sec)
```

3. possible_keys: 表示查询时能够使用到的索引，并不一定会真的使用，显示的是索引名称

4. key: 表示查询时真正用到的索引，显示的是索引名称

5. rows: MySQL查询优化器根据统计信息，估算要查询到结果需要扫描多少行记录。原则上rows越少效率越高。

6. key_len: 表示查询使用了索引的字节数量。可以判断是否全部使用了联合索引。

7. extra: 表示额外信息，通常有以下表现

- using where: 表示查询需要通过索引回表查询数据。即通过普通索引查询出主键，再通过主键查询出数据。

```sql
mysql> explain select age from t_users where age = 15 and name = '张三';
+----+-------------+---------+------------+------+----------------+----------------+---------+-------+------+----------+-------------+
| id | select_type | table   | partitions | type | possible_keys  | key            | key_len | ref   | rows | filtered | Extra       |
+----+-------------+---------+------------+------+----------------+----------------+---------+-------+------+----------+-------------+
|  1 | SIMPLE      | t_users | NULL       | ref  | idx_t_user_age | idx_t_user_age | 4       | const |    1 |    33.33 | Using where |
+----+-------------+---------+------------+------+----------------+----------------+---------+-------+------+----------+-------------+
1 row in set, 1 warning (0.00 sec)
```

- using index: 表示通过索引就能查询出所需要的数据。**效率最高**

```sql
mysql> explain select age from t_users where age=1;
+----+-------------+---------+------------+------+----------------+----------------+---------+-------+------+----------+-------------+
| id | select_type | table   | partitions | type | possible_keys  | key            | key_len | ref   | rows | filtered | Extra       |
+----+-------------+---------+------------+------+----------------+----------------+---------+-------+------+----------+-------------+
|  1 | SIMPLE      | t_users | NULL       | ref  | idx_t_user_age | idx_t_user_age | 4       | const |    1 |   100.00 | Using index |
+----+-------------+---------+------------+------+----------------+----------------+---------+-------+------+----------+-------------+
1 row in set, 1 warning (0.00 sec)
```

- using filesort: 表示查询结果需要额外排序，数据量小在内存，数据量大在磁盘。如果出现这个字段，建议优化SQL

```sql
mysql> explain select * from t_users order by id;
+----+-------------+---------+------------+-------+---------------+---------+---------+------+------+----------+-------+
| id | select_type | table   | partitions | type  | possible_keys | key     | key_len | ref  | rows | filtered | Extra |
+----+-------------+---------+------------+-------+---------------+---------+---------+------+------+----------+-------+
|  1 | SIMPLE      | t_users | NULL       | index | NULL          | PRIMARY | 8       | NULL |    3 |   100.00 | NULL  |
+----+-------------+---------+------------+-------+---------------+---------+---------+------+------+----------+-------+
1 row in set, 1 warning (0.00 sec)

mysql> explain select * from t_users order by id,age;
+----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+----------------+
| id | select_type | table   | partitions | type | possible_keys | key  | key_len | ref  | rows | filtered | Extra          |
+----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+----------------+
|  1 | SIMPLE      | t_users | NULL       | ALL  | NULL          | NULL | NULL    | NULL |    3 |   100.00 | Using filesort |
+----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+----------------+
1 row in set, 1 warning (0.00 sec)
```

- using temproary: 表示查询用到了临时表，一般出现在去重、分组等操作

```sql
mysql> explain select distinct name from t_users;
+----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-----------------+
| id | select_type | table   | partitions | type | possible_keys | key  | key_len | ref  | rows | filtered | Extra           |
+----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-----------------+
|  1 | SIMPLE      | t_users | NULL       | ALL  | NULL          | NULL | NULL    | NULL |    3 |   100.00 | Using temporary |
+----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-----------------+
1 row in set, 1 warning (0.00 sec)

mysql> explain select name, count(*) name from t_users group by name;
+----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-----------------+
| id | select_type | table   | partitions | type | possible_keys | key  | key_len | ref  | rows | filtered | Extra           |
+----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-----------------+
|  1 | SIMPLE      | t_users | NULL       | ALL  | NULL          | NULL | NULL    | NULL |    3 |   100.00 | Using temporary |
+----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-----------------+
1 row in set, 2 warnings (0.00 sec)
```

### 索引失效场景

#### 使用原则

1. 使用联合索引应满足最左匹配原则

2. 匹配数据从左至右，遇到范围查询(>、<、between、like)会停止匹配

3. 尽量选择高区分度的字段作为索引

区分度公式：`count(distinct col) / count(*)`，表示字段不重复的比例，比例越大扫描的记录数越少。

4. 索引尽量不用在高频更新的字段上，最好用在高频查询字段

#### 失效场景

1. like '%xx'

```sql
select * from t_users where name like '%张';
```

首字母有序时，后续相对有序，但无法确定首字符时，查询是乱序的。

2. 使用函数

比如将索引列放入函数计算中，就无法走索引，比如`max(age)`。其原因在于，B+树需要把所有元素都应用在函数中才能比较。

3. or

比如`a,b,c`三个字段，`a`和`b`建了索引，`c`没有建索引

当执行如下SQL时，能使用索引

```sql
select * from test where a = 1 or b = 2;
```

当执行如下SQL时，不能使用索引，a和b的索引失效

```sql
select * from test where a = 1 or b = 2 or c = 3;
```

4. 使用select *

select *会采用全表扫描，即使建立了索引，索引也会进行回表，效率低下

5. 字段类型不同

比如有个字段age，原本是varchar，但SQL查询时用的int类型传参，虽然查询能够成功，但实际上走的全表扫描，MySQL通过字段的隐式转换保证了SQL执行成功

```sql
select * from test where age = 123;
```

6. 不等于

普通索引的不等于不会走索引

```sql
select * from test where name !='张三';
```

主键索引的不等于会走索引

```sql
select * from test where id ! = 123;
```

7. order by

order by排序条件为索引，则select字段必须也是索引字段，否则无法命中索引

如果对主键排序，则还是能够走索引

```sql
select * from test order by id desc;
```

8. 范围查询

比如`a,b,c`三个字段，`a`、`b`、`c`都建了索引

```sql
select * from test where a = 1 and b > 2 and c = 3
```

只有a和b能够走索引，c不能走索引，范围查询就是索引截断处，原因和联合索引一致，在无法确定b有多少数量时，无法保证b的顺序性，在这个前提下导致c无法确定

### 小表驱动大表

这里补充一个额外的知识，小表驱动大表。

首先引入一张网络中流传的经典图，了解`left join`, `inner join`, `right join`等常见结果

::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/mysql-join.png/zipstyle)
:::

所谓的小表驱动大表，可以理解为用小的数据集去匹配大的数据集。

比如表A中有10条数据，表B中有10w条数据，外部执行一次连接，内部要执行多次

按照小表驱动大表，A驱动B，则伪代码可写为

```java
for (10条) {
    for (10w条) {
        ...
    }
}
```

大表驱动小表，即B驱动A，伪代码可写为

```java
for (10w条) {
    for (10条) {
        ...
    }
}
```

两者的主要区别在于：小的循环在外层，表连接需要10次；大的循环在外层，表连接需要10w次。

**小表驱动大表的目的是为了减少连接创建的次数，加快查询速度**。

如何判断驱动表和非驱动表？

1 LEFT JOIN左连接, 左边为驱动表, 右边为被驱动表

2 RIGHT JOIN右连接, 右边为驱动表, 左边为被驱动表

3 INNER JOIN内连接, MySQL会选择数据量比较小的表作为驱动表，大表作为被驱动表

4 可通过EXPLANIN查看SQL语句的执行计划, EXPLANIN分析的第一行的表即是驱动表

## 总结
相信读完这篇文章，读者能够对索引和B+树的原理有一定的了解，在开发过程中解决慢SQL最为基本的分析方式可以采用explain，加上索引能够最简单有效的加快查询效率

除此之外还可以从网络、MySQL架构(读写分离/冷热备)等方向进行考虑，由于篇幅原因这里暂不介绍了~

## 参考文章

> 《MySQL45讲》
>
> <https://www.cnblogs.com/aaabbbcccddd/p/14864982.html>
>
> <https://www.jb51.net/article/229580.htm>
>
> <https://mp.weixin.qq.com/s/SSHWKcuGK5x4Uf7ZBC7stQ>
>
> <https://blog.csdn.net/q736317048/article/details/114415571>
>
> <https://www.cnblogs.com/heishuichenzhou/p/10813463.html>
>
> <https://mp.weixin.qq.com/s/tD_yDXBYfmLqN3BHmhOnfQ>
>
> <https://blog.csdn.net/ABestRookie/article/details/117059948>


